from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.apps import apps

class Command(BaseCommand):
    help = "Seed initial database data"

    def handle(self, *args, **options):
        # Create admin user
        User = get_user_model()
        user, created = User.objects.get_or_create(username='admin', email='admin@example.com')
        user.is_admin = True
        user.set_password('123')
        user.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "test" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "test" updated'))

        # Create regular user
        regular_user, created = User.objects.get_or_create(username='user', email='user@example.com')
        regular_user.is_admin = False
        regular_user.set_password('123')
        regular_user.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "user" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "user" updated'))

        # Create desks
        try:
            Desk = apps.get_model('core', 'Desk')
        except LookupError:
            self.stderr.write("core.Desk model not found - skipping desk seeding")
            return

        field_names = {f.name for f in Desk._meta.get_fields()}

        now = timezone.now()
        sample_desks = [
            {
                "id": 1,
                "wifi2ble_id": "cd:fb:1a:53:fb:e6",
                "name": "DESK 4486",
                "location": "Unknown",
                "position": 680,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 68.0,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Normal",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/cd:fb:1a:53:fb:e6",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 61,
                "sit_stand_counter": 19,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": 2,
                "wifi2ble_id": "ee:62:5b:b8:73:1d",
                "name": "DESK 6743",
                "location": "Unknown",
                "position": 1320,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 132.0,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Normal",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/ee:62:5b:b8:73:1d",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 30,
                "sit_stand_counter": 2,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": 3,
                "wifi2ble_id": "70:9e:d5:e7:8c:98",
                "name": "DESK 3677",
                "location": "Unknown",
                "position": 1054,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 105.4,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Collision",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/70:9e:d5:e7:8c:98",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 48,
                "sit_stand_counter": 10,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": 4,
                "wifi2ble_id": "00:ec:eb:50:c2:c8",
                "name": "DESK 3050",
                "location": "Unknown",
                "position": 680,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 68.0,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Normal",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/00:ec:eb:50:c2:c8",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 27,
                "sit_stand_counter": 1,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": 5,
                "wifi2ble_id": "f1:50:c2:b8:bf:22",
                "name": "DESK 8294",
                "location": "Unknown",
                "position": 1320,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 132.0,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Normal",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/f1:50:c2:b8:bf:22",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 52,
                "sit_stand_counter": 14,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": 6,
                "wifi2ble_id": "ce:38:a6:30:af:1d",
                "name": "DESK 7380",
                "location": "Unknown",
                "position": 862,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 86.2,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Collision",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/ce:38:a6:30:af:1d",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 53,
                "sit_stand_counter": 12,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": 7,
                "wifi2ble_id": "91:17:a4:3b:f4:4d",
                "name": "DESK 6782",
                "location": "Unknown",
                "position": 1022,
                "manufacturer": "Desk-O-Matic Co.",
                "current_height": 102.2,
                "min_height": 68.0,
                "max_height": 132.0,
                "current_status": "Collision",
                "api_endpoint": "http://localhost:8001/api/v2/<key>/desks/91:17:a4:3b:f4:4d",
                "last_error": "code:93",
                "error_timestamp": now,
                "total_activations": 51,
                "sit_stand_counter": 8,
                "notes": "Seeded from real data",
                "created_at": now,
                "updated_at": now,
            },
        ]

        for sd in sample_desks:
            defaults = {}
            for k, v in sd.items():
                if k == "wifi2ble_id":
                    continue
                if k in field_names:
                    defaults[k] = v

            # set current_user or current_user_id if available
            if "current_user" in field_names:
                defaults["current_user"] = regular_user
            elif "current_user_id" in field_names:
                defaults["current_user_id"] = regular_user.id

            desk_obj, created = Desk.objects.update_or_create(
                wifi2ble_id=sd["wifi2ble_id"],
                defaults=defaults,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created desk {desk_obj.wifi2ble_id} -> {desk_obj.name}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated desk {desk_obj.wifi2ble_id} -> {desk_obj.name}"))