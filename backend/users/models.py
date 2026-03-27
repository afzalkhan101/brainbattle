import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


def user_profile_image_path(instance, filename):
    ext = filename.split(".")[-1]
    return f"users/profile_images/{instance.pk}/{uuid.uuid4().hex}.{ext}"


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")

        email = self.normalize_email(email)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    class Role(models.TextChoices):
        STUDENT               = "student",               "Student"
        ADMIN                 = "admin",                 "Admin"
        COACHING_CENTER_OWNER = "coaching_center_owner", "Coaching Center Owner"
        UNIVERSITY_ADMIN      = "university_admin",      "University Admin"

    class ClassLevel(models.TextChoices):
        SSC       = "ssc",       "SSC"
        HSC       = "hsc",       "HSC"
        ADMISSION = "admission", "Admission"

    # ── Core ──────────────────────────────────────────────────────────────────
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
    )

    # ── Profile ───────────────────────────────────────────────────────────────
    phone         = models.CharField(max_length=20, blank=True, default="")
    profile_image = models.ImageField(
        upload_to=user_profile_image_path,
        null=True,
        blank=True,
    )
    class_level = models.CharField(
        max_length=20,
        choices=ClassLevel.choices,
        null=True,
        blank=True,
    )
    institution = models.CharField(max_length=255, blank=True, default="")

    # ── Email verification ────────────────────────────────────────────────────
    is_email_verified = models.BooleanField(default=False)

    # ── Django internals ──────────────────────────────────────────────────────
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    # ── Referral ──────────────────────────────────────────────────────────────
    referral_code = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        db_index=True,
    )
    referred_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="referrals",
    )

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        ordering = ["-date_joined"]
        indexes  = [
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = self._generate_referral_code()
        super().save(*args, **kwargs)

    def _generate_referral_code(self):
        while True:
            code = uuid.uuid4().hex[:10].upper()
            if not User.objects.filter(referral_code=code).exists():
                return code


# ── Wallet ────────────────────────────────────────────────────────────────────

class Wallet(models.Model):
    user    = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} — {self.balance}"

    def credit(self, amount):
        if amount <= 0:
            raise ValueError("Credit amount must be positive.")
        self.balance += amount
        self.save(update_fields=["balance", "updated"])

    def debit(self, amount):
        if amount <= 0:
            raise ValueError("Debit amount must be positive.")
        if self.balance < amount:
            raise ValueError("Insufficient wallet balance.")
        self.balance -= amount
        self.save(update_fields=["balance", "updated"])


class WalletTransaction(models.Model):

    class TxType(models.TextChoices):
        CREDIT   = "credit",   "Credit"
        DEBIT    = "debit",    "Debit"
        REFERRAL = "referral", "Referral Bonus"

    wallet      = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    tx_type     = models.CharField(max_length=20, choices=TxType.choices)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.wallet.user.email} | {self.tx_type} | {self.amount}"
