from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.apps import apps
from decouple import config
from datetime import timedelta
from django.db import connection  # Import connection

class Command(BaseCommand):
    help = "Seed initial database data"

    def handle(self, *args, **options):
        # -------------------------------------------------
        # Seed users
        # -------------------------------------------------
        User = get_user_model()
        admin_user, created = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com'})
        admin_user.first_name = 'Admin'
        admin_user.last_name = 'User'
        admin_user.is_admin = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.department = 'Engineering'
        admin_user.set_password('123')
        admin_user.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "admin" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "admin" updated'))

        # Create regular users
        regular_user, created = User.objects.get_or_create(username='user', defaults={'email': 'user@example.com'})
        regular_user.first_name = 'Michael'
        regular_user.last_name = 'Wazowski'
        regular_user.is_admin = False
        regular_user.is_staff = False
        regular_user.department = 'Design'
        regular_user.set_password('123')
        regular_user.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "user" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "user" updated'))

        # (user2)
        regular_user2, created = User.objects.get_or_create(username='user2', defaults={'email': 'user2@example.com'})
        regular_user2.first_name = 'Walter'
        regular_user2.last_name = 'White'
        regular_user2.is_admin = False
        regular_user2.is_staff = False
        regular_user2.department = 'Science'
        regular_user2.set_password('123')
        regular_user2.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "user2" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "user2" updated'))

        # (user3)
        regular_user3, created = User.objects.get_or_create(username='user3', defaults={'email': 'user3@example.com'})
        regular_user3.first_name = 'Steve'
        regular_user3.last_name = 'Jobs'
        regular_user3.is_admin = False
        regular_user3.is_staff = False
        regular_user3.department = 'Marketing'
        regular_user3.set_password('123')
        regular_user3.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "user3" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "user3" updated'))

        # (user4)
        regular_user4, created = User.objects.get_or_create(username='user4', defaults={'email': 'user4@example.com'})
        regular_user4.first_name = 'Larry'
        regular_user4.last_name = 'Smalls'
        regular_user4.is_admin = False
        regular_user4.is_staff = False
        regular_user4.department = 'Engineering'
        regular_user4.set_password('123')
        regular_user4.save()
        if created:
            self.stdout.write(self.style.SUCCESS('User "user4" created successfully'))
        else:
            self.stdout.write(self.style.WARNING('User "user4" updated'))


        # -------------------------------------------------
        # Create desks
        # -------------------------------------------------
        try:
            Desk = apps.get_model('core', 'Desk')
        except LookupError:
            self.stderr.write("core.Desk model not found - skipping desk seeding")
            return

        field_names = {f.name for f in Desk._meta.get_fields()}

        now = timezone.now()
        sample_desks = [
            {
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

            desk_obj, created = Desk.objects.update_or_create(
                wifi2ble_id=sd["wifi2ble_id"],
                defaults=defaults,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created desk {desk_obj.wifi2ble_id} -> {desk_obj.name}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated desk {desk_obj.wifi2ble_id} -> {desk_obj.name}"))


        # -------------------------------------------------
        # Create Pico W
        # -------------------------------------------------
        try:
            Pico = apps.get_model('core', 'Pico')
        except LookupError:
            self.stderr.write("core.Pico model not found - skipping Pico seeding")
            return

        pico_data = [
            {
                "mac_address": config('PICO_MAC_ADDRESS', default='00:00:00:00:00:00'),
                "ip_address": config('PICO_IP_ADDRESS', default='0.0.0.0'),
                "status": "nothing",
                "last_seen": timezone.datetime(2025, 3, 4, 0, 18, 27, tzinfo=timezone.get_current_timezone()),
                "has_temperature_sensor": True,
                "has_light_sensor": True,
                "has_led_display": True,
                "has_buzzer": True,
                "has_led_indicator": True,
                "firmware_version": "1.0.0",
                "notes": "ok",
                "created_at": timezone.datetime(2025, 2, 17, 5, 32, 51, tzinfo=timezone.get_current_timezone()),
                "updated_at": timezone.datetime(2025, 3, 4, 0, 18, 27, tzinfo=timezone.get_current_timezone()),
                "desk_id": 1,  # Link to Desk 4486
            },
        ]

        for pico in pico_data:
            defaults = {k: v for k, v in pico.items() if k != "mac_address"}
            pico_obj, created = Pico.objects.update_or_create(
                mac_address=pico["mac_address"],
                defaults=defaults,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Pico {pico_obj.mac_address} -> Desk ID {pico_obj.desk_id}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated Pico {pico_obj.mac_address} -> Desk ID {pico_obj.desk_id}"))


        # -------------------------------------------------
        # Seed sample reservations and desk usage logs
        # -------------------------------------------------
        try:
            Reservation = apps.get_model('core', 'Reservation')
            DeskUsageLog = apps.get_model('core', 'DeskUsageLog')
        except LookupError:
            self.stderr.write("Reservation or DeskUsageLog model not found - skipping analytics seeding")
            return

        desks = list(Desk.objects.all()[:5])
        if not desks:
            self.stdout.write(self.style.WARNING('No desks found, skipping reservations seeding'))
            return

        now = timezone.now()
        base_day = now.replace(hour=8, minute=0, second=0, microsecond=0)

        sample_reservations = []

        # Create a few days of reservations for user2
        for day_offset in range(0, 8):
            day_start = base_day - timedelta(days=day_offset)

            sample_reservations.append({
                "user": regular_user2,
                "desk": desks[0],
                "start_time": day_start,
                "end_time": day_start + timedelta(hours=9),
                "status": "completed",
                "cancellation_reason": "",
            })
        
        # Create a few days of reservations for user3
        for day_offset in range(0, 5):
            day_start = base_day - timedelta(days=day_offset)

            sample_reservations.append({
                "user": regular_user3,
                "desk": desks[4],
                "start_time": day_start + timedelta(hours=2),
                "end_time": day_start + timedelta(hours=5),
                "status": "completed",
                "cancellation_reason": "",
            })
        
        # Create a few days of reservations for user4
        for day_offset in range(0, 12):
            day_start = base_day - timedelta(days=day_offset)

            sample_reservations.append({
                "user": regular_user4,
                "desk": desks[3],
                "start_time": day_start,
                "end_time": day_start + timedelta(hours=9),
                "status": "completed",
                "cancellation_reason": "",
            })

        # Create a few cancelled reservations
        cancel_start = base_day - timedelta(days=2, hours=1)
        sample_reservations.append({
            "user": regular_user2,
            "desk": desks[0],
            "start_time": cancel_start,
            "end_time": cancel_start + timedelta(hours=2),
            "status": "cancelled",
            "cancellation_reason": "",
        })
        sample_reservations.append({
            "user": regular_user3,
            "desk": desks[1],
            "start_time": cancel_start + timedelta(days=2),
            "end_time": cancel_start + timedelta(days=2, hours=1),
            "status": "cancelled",
            "cancellation_reason": "",
        })

        self.stdout.write(self.style.SUCCESS(f'Seeding {len(sample_reservations)} reservations and matching usage logs'))

        for res_data in sample_reservations:
            reservation, created = Reservation.objects.get_or_create(
                user=res_data["user"],
                desk=res_data["desk"],
                start_time=res_data["start_time"],
                defaults={
                    "end_time": res_data["end_time"],
                    "status": res_data["status"],
                    "cancellation_reason": res_data.get("cancellation_reason", ""),
                    "cancelled_at": res_data["end_time"] if res_data["status"] == "cancelled" else None,
                },
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created reservation for {reservation.user.email} on {reservation.start_time}"
                    )
                )

            # Create a matching DeskUsageLog only for non-cancelled reservations
            if reservation.status != "cancelled":
                duration_seconds = int((reservation.end_time - reservation.start_time).total_seconds())
                # Split roughly 60/40 between sitting and standing
                sitting = int(duration_seconds * 0.6)
                standing = duration_seconds - sitting

                log, created_log = DeskUsageLog.objects.get_or_create(
                    user=reservation.user,
                    desk=reservation.desk,
                    started_at=reservation.start_time,
                    defaults={
                        "ended_at": reservation.end_time,
                        "sitting_time": sitting,
                        "standing_time": standing,
                        "position_changes": 3,
                        "source": "seed",
                    },
                )
                if created_log:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Created usage log for {log.user.email} on desk {log.desk.name}"
                        )
                    )