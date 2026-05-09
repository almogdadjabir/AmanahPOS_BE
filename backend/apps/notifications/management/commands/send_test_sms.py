"""
Management command to send a test SMS and verify the configured provider.

Usage:
    python manage.py send_test_sms +249912300001
    python manage.py send_test_sms +249912300001 --otp 999999
"""
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from apps.core.utils import send_sms_otp


class Command(BaseCommand):
    help = "Send a test OTP SMS to verify the configured SMS provider"

    def add_arguments(self, parser):
        parser.add_argument(
            "phone",
            help="Recipient phone in E.164 format, e.g. +249912300001",
        )
        parser.add_argument(
            "--otp",
            default="123456",
            help="OTP code to include in the message (default: 123456)",
        )

    def handle(self, *args, **options):
        phone = options["phone"]
        otp = options["otp"]
        provider = getattr(settings, "SMS_PROVIDER", "stub")

        self.stdout.write(f"Provider : {provider}")
        self.stdout.write(f"Recipient: {phone}")
        self.stdout.write(f"OTP      : {otp}")
        self.stdout.write("Sending...")

        success = send_sms_otp(phone, otp)

        if success:
            self.stdout.write(self.style.SUCCESS("SMS sent successfully."))
        else:
            raise CommandError("Failed to send SMS. Check logs for details.")
