from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Wallet, WalletTransaction


class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    referred_by_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Only these roles are allowed during public registration
    ALLOWED_ROLES = {User.Role.STUDENT, User.Role.COACHING_CENTER_OWNER, User.Role.UNIVERSITY_ADMIN}

    class Meta:
        model  = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "password_confirm",
            "referred_by_code",
        ]

    def validate_role(self, value):
        if value not in self.ALLOWED_ROLES:
            raise serializers.ValidationError(
                f"Invalid role. Allowed: {', '.join(self.ALLOWED_ROLES)}"
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        referred_by_code = validated_data.pop("referred_by_code", None)
        referred_by_user = None

        if referred_by_code:
            try:
                referred_by_user = User.objects.get(referral_code=referred_by_code)
            except User.DoesNotExist:
                raise serializers.ValidationError({"referred_by_code": "Invalid referral code."})

        user = User.objects.create_user(**validated_data)

        if referred_by_user:
            user.referred_by = referred_by_user
            user.save(update_fields=["referred_by"])

        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account has been disabled.")
        attrs["user"] = user
        return attrs


# ── Profile Serializers ───────────────────────────────────────────────────────

class ReferredBySerializer(serializers.ModelSerializer):
    """Minimal representation of the referrer."""
    class Meta:
        model  = User
        fields = ["id", "full_name", "email"]


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Full read-only profile serializer.
    Used in GET /profile/ and in auth responses.
    """
    full_name   = serializers.ReadOnlyField()
    referred_by = ReferredBySerializer(read_only=True)
    wallet_balance = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "phone",
            "profile_image",
            "class_level",
            "institution",
            "is_email_verified",
            "referral_code",
            "referred_by",
            "wallet_balance",
            "date_joined",
        ]
        read_only_fields = fields  # all read-only

    def get_wallet_balance(self, obj):
        try:
            return str(obj.wallet.balance)
        except Wallet.DoesNotExist:
            return "0.00"


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Write serializer for PATCH /profile/update/
    Only editable fields are exposed.
    """
    class Meta:
        model  = User
        fields = [
            "first_name",
            "last_name",
            "phone",
            "profile_image",
            "class_level",
            "institution",
        ]

    def validate_phone(self, value):
        if value:
            cleaned = value.replace("+", "").replace("-", "").replace(" ", "")
            if not cleaned.isdigit():
                raise serializers.ValidationError("Enter a valid phone number.")
            if not (7 <= len(cleaned) <= 15):
                raise serializers.ValidationError("Phone number must be 7–15 digits.")
        return value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(update_fields=list(validated_data.keys()))
        return instance


# ── Password Serializers ──────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate_new_password(self, value):
        old = self.initial_data.get("old_password")
        if old and value == old:
            raise serializers.ValidationError("New password must differ from old password.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


# ── Wallet Serializers ────────────────────────────────────────────────────────

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WalletTransaction
        fields = ["id", "tx_type", "amount", "description", "created_at"]
        read_only_fields = fields


class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model  = Wallet
        fields = ["balance", "updated", "transactions"]
        read_only_fields = fields
