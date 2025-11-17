## Endpoints

### 1. Get All Desks

- **Endpoint**: `GET /api/v2/<api_key>/desks`
- **Description**: Retrieve a list of all desk IDs available in the system.
- **Response**:
  - **Status**: `200 OK`
  - **Body**: Array of desk IDs.
    ```json
    ["cd:fb:1a:53:fb:e6", "ee:62:5b:b8:73:1d"]
    ```
- **Errors**:
  - `401 Unauthorized`: Invalid API key.
  - `400 Bad Request`: Incorrect endpoint format or version mismatch.

### 2. Get Specific Desk Data

- **Endpoint**: `GET /api/v2/<api_key>/desks/<desk_id>`
- **Description**: Retrieve detailed data for a specific desk by its ID.
- **Path Parameters**:
  - `desk_id`: The ID of the desk to retrieve.
- **Response**:
  - **Status**: `200 OK`
  - **Body**: JSON object with desk configuration, state, usage, and errors.
```json
{
    "config": {
    "name": "DESK 4486",
    "manufacturer": "Desk-O-Matic Co."
    },
    "state": {
    "position_mm": 680,
    "speed_mms": 0,
    "status": "Normal",
    "isPositionLost": false,
    "isOverloadProtectionUp": false,
    "isOverloadProtectionDown": false,
    "isAntiCollision": false
    },
    "usage": {
    "activationsCounter": 25,
    "sitStandCounter": 1
    },
    "lastErrors": [
    {
        "time_s": 120,
        "errorCode": 93
    }
    ]
}
```
- **Errors**:
  - `404 Not Found`: Desk not found.
  - `401 Unauthorized`: Invalid API key.
  - `400 Bad Request`: Incorrect endpoint format or version mismatch.

### 3. Get Specific Category Data of a Desk

- **Endpoint**: `GET /api/v2/<api_key>/desks/<desk_id>/<category>`
- **Description**: Retrieve a specific category (`config`, `state`, `usage`, or `lastErrors`) of a desk's data.
- **Path Parameters**:
  - `desk_id`: The ID of the desk.
  - `category`: The category of data to retrieve (e.g., `config`, `state`, `usage`, `lastErrors`).
- **Response**:
  - **Status**: `200 OK`
  - **Body**: JSON object with the requested category data.
- **Errors**:
  - `404 Not Found`: Desk or category not found.
  - `401 Unauthorized`: Invalid API key.
  - `400 Bad Request`: Incorrect endpoint format or version mismatch.

### 4. Update Specific Category Data of a Desk

- **Endpoint**: `PUT /api/v2/<api_key>/desks/<desk_id>/<category>`
- **Description**: Update a specific category of a desk, such as setting a new `position_mm` in the `state` category.
- **Path Parameters**:
  - `desk_id`: The ID of the desk.
  - `category`: The category of data to update (only `state` category is currently updatable).
- **Request Body**:
  - **Content-Type**: `application/json`
  - **Body**: JSON object with the data to update. Example for updating position:
```json
{
    "position_mm": 1000
}
```
- **Response**:
  - **Status**: `200 OK`
  - **Body**: JSON object indicating the allowed position after the update.
```json
{
    "position_mm": 1000
}
```
- **Errors**:
  - `404 Not Found`: Desk or category not found.
  - `401 Unauthorized`: Invalid API key.
  - `400 Bad Request`: Incorrect endpoint format or invalid data type in the request body.

## Error Responses

For all endpoints, the API may return the following standard error responses:

- **400 Bad Request**: Returned if the request path or parameters are incorrect.
  - **Example**:
```json
{
    "error": "Invalid endpoint"
}
```

- **401 Unauthorized**: Returned if an invalid API key is provided.
  - **Example**:
```json
{
    "error": "Unauthorized"
}
```

- **404 Not Found**: Returned if a specified desk or category is not found.
  - **Example**:
```json
{
    "error": "Desk not found"
}
```

- **405 Method Not Allowed**: Returned if an unsupported HTTP method is used (e.g., `POST`, `DELETE`, `PATCH`).
  - **Example**:
```json
{
    "error": "Method Not Allowed"
}
```