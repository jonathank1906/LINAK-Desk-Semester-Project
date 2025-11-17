# Authentication Endpoints

## Log Out
Endpoint: `POST /api/auth/logout/`

Description: Logs out the currently authenticated user.


- Requires JWT cookies (`access_token`, `refresh_token`)
- Uses `IsAuthenticated`

Response
```json
{
  "success": true
}
```
Errors:
- `400`