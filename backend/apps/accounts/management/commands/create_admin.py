from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError


class Command(BaseCommand):
    help = 'Create a superuser (admin) for AmanaPOS. Pass --phone and --password, or run interactively.'

    def add_arguments(self, parser):
        parser.add_argument('--phone',     type=str, help='Phone number (e.g. +249912345678)')
        parser.add_argument('--password',  type=str, help='Password (min 8 chars)')
        parser.add_argument('--name',      type=str, default='Admin', help='Full name (default: Admin)')
        parser.add_argument('--email',     type=str, default=None,    help='Email address (optional)')

    def handle(self, *args, **options):
        from apps.accounts.models import CustomUser

        phone    = options['phone']    or input('Phone (+249...): ').strip()
        password = options['password'] or self._prompt_password()
        name     = options['name']
        email    = options['email']

        if not phone:
            raise CommandError('Phone number is required.')
        if len(password) < 8:
            raise CommandError('Password must be at least 8 characters.')

        try:
            user = CustomUser.objects.create_superuser(
                phone=phone,
                password=password,
                full_name=name,
                email=email or None,
                is_verified=True,
                has_password=True,
            )
            self.stdout.write(self.style.SUCCESS(
                f'\nAdmin created successfully!\n'
                f'  Phone:  {user.phone}\n'
                f'  Name:   {user.full_name}\n'
                f'  Role:   {user.role}\n'
                f'  ID:     {user.id}\n'
            ))
        except IntegrityError:
            raise CommandError(f'A user with phone "{phone}" already exists.')

    def _prompt_password(self):
        import getpass
        while True:
            pw = getpass.getpass('Password: ')
            pw2 = getpass.getpass('Password (again): ')
            if pw == pw2:
                return pw
            self.stdout.write(self.style.WARNING("Passwords don't match, try again."))
