from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Wallet, WalletTransaction


@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    """Auto-create a wallet for every new user."""
    if created:
        Wallet.objects.create(user=instance)


@receiver(post_save, sender=User)
def grant_referral_bonus(sender, instance, created, **kwargs):
    """
    When a new user registers with a referral code,
    credit the referrer's wallet with a bonus.
    """
    if created and instance.referred_by:
        bonus_amount = 50  # BDT — adjust as needed

        try:
            referrer_wallet = instance.referred_by.wallet
        except Wallet.DoesNotExist:
            return

        referrer_wallet.credit(bonus_amount)
        WalletTransaction.objects.create(
            wallet=referrer_wallet,
            tx_type=WalletTransaction.TxType.REFERRAL,
            amount=bonus_amount,
            description=f"Referral bonus for inviting {instance.email}",
        )
