"""
Django management command to execute scheduled desk cleaning tasks.

This command checks for schedules that should run at the current time
and executes them by moving all available desks to the configured height.

Usage:
    python manage.py run_desk_schedules

This should be run via cron every minute. Example crontab:
    * * * * * cd /path/to/project && source env/bin/activate && python manage.py run_desk_schedules >> /var/log/desk_schedules.log 2>&1
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime
from core.models import DeskSchedule, Desk, DeskLog
from core.services.WiFi2BLEService import WiFi2BLEService


class Command(BaseCommand):
    help = 'Execute scheduled desk cleaning tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be executed without actually moving desks',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        now = timezone.now()
        current_time = now.time()
        current_weekday = now.weekday()  # Monday=0, Sunday=6
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No desks will be moved'))
        
        self.stdout.write(f'Checking schedules for {now.strftime("%A, %H:%M")}...')
        
        # Find schedules that should run now
        # Match: active schedules, current weekday, and current hour:minute
        schedules = DeskSchedule.objects.filter(
            is_active=True,
            time__hour=current_time.hour,
            time__minute=current_time.minute,
        )
        
        # Filter by weekday (stored as JSON array)
        schedules_to_run = []
        for schedule in schedules:
            if current_weekday in schedule.weekdays:
                schedules_to_run.append(schedule)
        
        if not schedules_to_run:
            self.stdout.write(self.style.SUCCESS('No schedules to execute at this time'))
            return
        
        self.stdout.write(f'Found {len(schedules_to_run)} schedule(s) to execute')
        
        for schedule in schedules_to_run:
            self.stdout.write(f'\nExecuting: {schedule.name}')
            self.stdout.write(f'  Target height: {schedule.target_height} cm')
            
            if dry_run:
                # In dry run, just show what would happen
                all_desks = Desk.objects.all()
                available_count = all_desks.filter(current_user__isnull=True).count()
                self.stdout.write(f'  Would move {available_count} available desks')
                continue
            
            # Execute the schedule
            result = self._execute_schedule(schedule)
            
            # Display results
            self.stdout.write(f'  ✓ Success: {result["success"]} desks')
            self.stdout.write(f'  ✗ Failed: {result["failed"]} desks')
            self.stdout.write(f'  ⊘ Skipped: {result["skipped"]} desks')
            
            if result["failed"] > 0:
                self.stdout.write(self.style.WARNING(f'  Some desks failed to move'))
            
            self.stdout.write(self.style.SUCCESS(f'  Schedule "{schedule.name}" completed'))
    
    def _execute_schedule(self, schedule):
        """Execute a schedule by moving all available desks"""
        all_desks = Desk.objects.all()
        wifi2ble = WiFi2BLEService()
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        for desk in all_desks:
            # Skip desks currently in use
            if desk.current_user is not None:
                skipped_count += 1
                continue
            
            # Skip desks without WiFi2BLE integration
            if not desk.wifi2ble_id or not desk.api_endpoint:
                skipped_count += 1
                continue
            
            try:
                # Send command to WiFi2BLE
                success = wifi2ble.set_desk_height(desk.wifi2ble_id, schedule.target_height)
                
                if success:
                    # Update desk in database
                    desk.current_height = schedule.target_height
                    desk.current_status = 'moving'
                    desk.save()
                    
                    # Log the action
                    DeskLog.objects.create(
                        desk=desk,
                        user=None,  # System action
                        action=f"Automated cleaning schedule: {schedule.name}",
                        height=schedule.target_height
                    )
                    
                    success_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                self.stderr.write(f'Error moving desk {desk.name}: {str(e)}')
                failed_count += 1
        
        # Update last_executed timestamp
        schedule.last_executed = timezone.now()
        schedule.save()
        
        return {
            'success': success_count,
            'failed': failed_count,
            'skipped': skipped_count
        }
