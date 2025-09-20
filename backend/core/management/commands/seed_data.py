from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Seed initial database data"

    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.get_or_create(username='admin', email='admin@example.com')
        user.is_admin = True
        user.set_password('123')
        user.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "test" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "test" updated'))