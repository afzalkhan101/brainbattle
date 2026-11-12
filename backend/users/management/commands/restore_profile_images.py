"""Copy referenced legacy uploads into the configured media storage."""
from pathlib import Path
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'Recover referenced profile images from the legacy users/profile_images directory. Dry run unless --apply is supplied.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        recovered = missing = 0
        legacy_root = (settings.BASE_DIR / 'users' / 'profile_images').resolve()
        for user in User.objects.exclude(profile_image='').exclude(profile_image__isnull=True):
            image = user.profile_image
            if image.storage.exists(image.name):
                continue
            source = (settings.BASE_DIR / image.name).resolve()
            if not source.is_relative_to(legacy_root) or not source.is_file():
                missing += 1
                continue
            if options['apply']:
                with source.open('rb') as stream:
                    saved_name = image.storage.save(image.name, File(stream))
                if saved_name != image.name:
                    user.profile_image.name = saved_name
                    user.save(update_fields=['profile_image'])
            recovered += 1
        self.stdout.write(f"{'Recovered' if options['apply'] else 'Recoverable'}: {recovered}. Missing original files: {missing}.")
