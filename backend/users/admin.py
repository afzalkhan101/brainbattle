from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, Wallet, WalletTransaction


# ── User Admin ────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = (
        "email", "full_name", "role", "class_level",
        "is_email_verified", "is_active", "date_joined",
    )
    list_filter   = ("role", "class_level", "is_email_verified", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name", "phone", "referral_code")
    ordering      = ("-date_joined",)
    readonly_fields = ("date_joined", "referral_code", "referred_by", "profile_image_preview")

    fieldsets = (
        ("Credentials", {
            "fields": ("email", "password"),
        }),
        ("Personal Info", {
            "fields": (
                "first_name", "last_name", "phone",
                "profile_image", "profile_image_preview",
                "class_level", "institution",
            ),
        }),
        ("Role & Status", {
            "fields": ("role", "is_email_verified", "is_active", "is_staff", "is_superuser"),
        }),
        ("Referral", {
            "fields": ("referral_code", "referred_by"),
        }),
        ("Permissions", {
            "classes": ("collapse",),
            "fields":  ("groups", "user_permissions"),
        }),
        ("Timestamps", {
            "fields": ("date_joined",),
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields":  (
                "email", "first_name", "last_name",
                "role", "password1", "password2",
            ),
        }),
    )

    def profile_image_preview(self, obj):
        if obj.profile_image:
            return format_html(
                '<img src="{}" width="80" height="80" '
                'style="border-radius:50%; object-fit:cover;" />',
                obj.profile_image.url,
            )
        return "No image"
    profile_image_preview.short_description = "Preview"


# ── Wallet Admin ──────────────────────────────────────────────────────────────

class WalletTransactionInline(admin.TabularInline):
    model          = WalletTransaction
    extra          = 0
    readonly_fields = ("tx_type", "amount", "description", "created_at")
    can_delete     = False
    max_num        = 20
    ordering       = ("-created_at",)


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display  = ("user", "balance", "updated")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    readonly_fields = ("user", "updated")
    inlines       = [WalletTransactionInline]


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display  = ("wallet", "tx_type", "amount", "description", "created_at")
    list_filter   = ("tx_type",)
    search_fields = ("wallet__user__email", "description")
    readonly_fields = ("wallet", "tx_type", "amount", "description", "created_at")
    ordering      = ("-created_at",)

    def has_add_permission(self, request):
        return False  # Transactions should only be created via code

    def has_delete_permission(self, request, obj=None):
        return False  # Never allow deletion of financial records
