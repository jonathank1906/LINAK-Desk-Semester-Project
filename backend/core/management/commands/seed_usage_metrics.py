"""
Management command to seed sample desk usage data for testing user metrics
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import UserAccount, Desk, DeskUsageLog
import random


class Command(BaseCommand):
    help = 'Seed sample desk usage data for testing metrics'

    def handle(self, *args, **options):
        self.stdout.write("Seeding desk usage data...")

        # Get all non-admin users
        users = UserAccount.objects.filter(is_admin=False)
        if not users.exists():
            self.stderr.write("No non-admin users found. Please create users first.")
            return

        # Get all desks
        desks = list(Desk.objects.all())
        if not desks:
            self.stderr.write("No desks found. Please create desks first.")
            return

        now = timezone.now()
        
        # Create usage logs for the last 30 days
        for user in users:
            # Random number of sessions per user (5-20)
            num_sessions = random.randint(5, 20)
            
            for _ in range(num_sessions):
                # Random day in last 30 days
                days_ago = random.randint(0, 29)
                start_time = now - timedelta(days=days_ago, hours=random.randint(8, 16))
                
                # Random session duration (1-4 hours)
                duration_hours = random.randint(1, 4)
                end_time = start_time + timedelta(hours=duration_hours)
                
                # Random sitting/standing split
                total_seconds = duration_hours * 3600
                sitting_percentage = random.uniform(0.3, 0.7)  # 30-70% sitting
                sitting_time = int(total_seconds * sitting_percentage)
                standing_time = int(total_seconds - sitting_time)
                
                # Random position changes (1 per 30 min on average)
                position_changes = random.randint(duration_hours * 1, duration_hours * 3)
                
                # Select random desk
                desk = random.choice(desks)
                
                DeskUsageLog.objects.create(
                    user=user,
                    desk=desk,
                    started_at=start_time,
                    ended_at=end_time,
                    sitting_time=sitting_time,
                    standing_time=standing_time,
                    position_changes=position_changes,
                    last_height_change=end_time,
                    source='hotdesk'
                )
                
                self.stdout.write(f"Created usage log: {user.email} - {desk.name} ({duration_hours}h)")

        self.stdout.write(self.style.SUCCESS("✅ Successfully seeded desk usage data!"))
