# Recurring Appointments -- Release Materials

## Feature Summary

Clinicians can now schedule recurring appointment series that automatically generate individual appointments on a weekly, biweekly, or monthly cadence. Series can be paused, resumed, or deleted at any time.

## Key Capabilities

- **Create recurring series**: Toggle "Repeat" when scheduling an appointment, choose frequency (Weekly / Every 2 weeks / Monthly), optionally set an end date.
- **Auto-generation**: A background job creates the next 4 weeks of appointments daily. No manual intervention needed.
- **Manage series**: View all recurring series from the "Recurring" button on the Calendar. Pause to stop future generation, resume to restart, delete to remove the series and all future scheduled appointments.
- **Visual indicator**: Appointments generated from a series show a recurring icon on the calendar card.
- **Conflict awareness**: Overlapping appointments are flagged during creation but do not block scheduling.

## How It Works

1. Open the appointment scheduler (Calendar > Schedule appointment).
2. Fill in client, service code, location, date/time as usual.
3. Check "Repeat" to enable recurring mode.
4. Choose frequency and optional end date.
5. Click "Schedule series" -- the first 4 weeks of appointments are created immediately.
6. Manage active series via Calendar > Recurring button.

## Technical Notes

- Series data is PHI and follows the same tenant isolation as appointments.
- Deleting a series removes future SCHEDULED appointments only. Attended or canceled appointments are preserved with no series link.
- Maximum 200 active series per clinician.
- Generation is idempotent -- running the cron multiple times never creates duplicates.

## Known Limitations

- Individual occurrence exceptions (skip one date, reschedule one) are not yet supported.
- GROUP appointment type is not available for recurring series.
- Mobile app shows recurring appointments but does not display series management.

## FAQ

**Q: What happens if I pause a series?**
A: No new appointments are generated. Existing scheduled appointments remain and can be managed individually.

**Q: Can I change the time of a recurring series?**
A: Yes -- edit the series and all future SCHEDULED appointments will be regenerated with the new time.

**Q: What if I delete an appointment from a recurring series?**
A: Only that individual appointment is removed. The series continues generating future appointments normally.
