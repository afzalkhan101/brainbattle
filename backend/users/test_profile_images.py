from io import BytesIO, StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase


class ProfileImageTests(APITestCase):
    def setUp(self):
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.user = get_user_model().objects.create_user('photo@example.com', 'test-password')
        self.client.force_authenticate(self.user)

    def photo(self, mode='RGB', size=(1600, 800), orientation=None):
        image = Image.new(mode, size, 'blue')
        out = BytesIO()
        if orientation:
            exif = Image.Exif()
            exif[274] = orientation
            image.save(out, 'JPEG', exif=exif)
        else:
            image.save(out, 'PNG')
        return SimpleUploadedFile('photo.jpg' if orientation else 'photo.png', out.getvalue(), content_type='image/jpeg' if orientation else 'image/png')

    def test_upload_persists_and_returns_media_url_after_reload(self):
        response = self.client.patch('/api/auth/profile/update/', {'profile_image': self.photo()}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('/media/users/profile_images/', response.data['profile_image'])
        self.user.refresh_from_db()
        self.assertTrue(self.user.profile_image.storage.exists(self.user.profile_image.name))
        with Image.open(self.user.profile_image.path) as image:
            self.assertEqual(image.size, (1024, 512))
        self.assertEqual(self.client.get('/api/auth/profile/').data['profile_image'], response.data['profile_image'])

    def test_phone_camera_orientation_is_corrected(self):
        response = self.client.patch('/api/auth/profile/update/', {'profile_image': self.photo(orientation=6)}, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        with Image.open(self.user.profile_image.path) as image:
            self.assertEqual(image.size, (512, 1024))
            self.assertIsNone(image.getexif().get(274))

    def test_transparent_photo_preserves_alpha(self):
        response = self.client.patch('/api/auth/profile/update/', {'profile_image': self.photo(mode='RGBA')}, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        with Image.open(self.user.profile_image.path) as image:
            self.assertEqual(image.mode, 'RGBA')

    def test_invalid_and_oversized_uploads_are_rejected(self):
        for upload in [SimpleUploadedFile('fake.png', b'not an image', content_type='image/png'),
                       SimpleUploadedFile('large.png', self.photo().read() + b'0' * (5 * 1024 * 1024), content_type='image/png')]:
            response = self.client.patch('/api/auth/profile/update/', {'profile_image': upload}, format='multipart')
            self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.profile_image)

    def test_other_profile_changes_preserve_the_photo(self):
        self.client.patch('/api/auth/profile/update/', {'profile_image': self.photo()}, format='multipart')
        previous = self.client.get('/api/auth/profile/').data['profile_image']
        response = self.client.patch('/api/auth/profile/update/', {'first_name': 'New'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['profile_image'], previous)

    def test_legacy_recovery_dry_run_apply_and_repeat(self):
        with TemporaryDirectory() as legacy:
            source = Path(legacy) / 'users/profile_images/1/photo.png'
            source.parent.mkdir(parents=True)
            source.write_bytes(self.photo().read())
            self.user.profile_image = 'users/profile_images/1/photo.png'
            self.user.save(update_fields=['profile_image'])
            with override_settings(BASE_DIR=Path(legacy)):
                call_command('restore_profile_images', stdout=StringIO())
                self.assertFalse(self.user.profile_image.storage.exists(self.user.profile_image.name))
                call_command('restore_profile_images', apply=True, stdout=StringIO())
                self.assertTrue(self.user.profile_image.storage.exists(self.user.profile_image.name))
                output = StringIO()
                call_command('restore_profile_images', apply=True, stdout=output)
                self.assertIn('Recovered: 0', output.getvalue())
