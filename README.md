# Zscaler RDP Connectivity Tester

A web application that tests RDP server connectivity through Zscaler ZPA policies to determine if your Guacamole proxy will work for end users.

## Overview

This tool helps you determine whether Zscaler will allow RDP connections to remote servers before users attempt to connect through your Guacamole proxy. It tests:

1. **DNS Resolution** - Whether the domain can be resolved
2. **RDP Port (3389)** - Whether the RDP port is reachable
3. **Control Port (443)** - Whether control channels work

## Test Matrix

| DNS     | RDP Port (3389) | Control Port (443) | Verdict                              |
| ------- | --------------- | ------------------ | ------------------------------------ |
| Fail    | N/A             | Works             | Domain blocked by DNS policy         |
| Success | Connected       | Works             | RDP port reachable                   |
| Success | Timeout         | Works             | Zscaler/Firewall blocking RDP        |
| Success | Timeout         | Fails             | Indeterminate (could be server down) |
| Success | Refused         | Works             | RDP service not running              |

## Installation

1. **Install Node.js** (version 14 or higher)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

1. Enter the domain name of the RDP server you want to test
2. Click "Run Test" or press Enter
3. Wait for the test to complete (usually 5-10 seconds)
4. Review the results and verdict

## Example Test Scenarios

### Scenario 1: Domain Blocked by DNS Policy
- **DNS**: Failed
- **RDP Port**: N/A
- **Control Port**: Works
- **Verdict**: Domain blocked by DNS policy
- **Explanation**: Zscaler is blocking DNS resolution for this domain

### Scenario 2: RDP Allowed
- **DNS**: Success
- **RDP Port**: Connected
- **Control Port**: Works
- **Verdict**: RDP port reachable
- **Explanation**: RDP connections should work through your proxy

### Scenario 3: RDP Blocked by Policy
- **DNS**: Success
- **RDP Port**: Timeout
- **Control Port**: Works
- **Verdict**: Zscaler/Firewall blocking RDP
- **Explanation**: RDP specifically blocked while other traffic allowed

### Scenario 4: Server Down
- **DNS**: Success
- **RDP Port**: Timeout
- **Control Port**: Fails
- **Verdict**: Indeterminate (could be server down)
- **Explanation**: All connections fail, server may be down

## API Endpoints

### POST /api/test-connectivity
Test connectivity to a domain.

**Request:**
```json
{
  "domain": "server.example.com"
}
```

**Response:**
```json
{
  "domain": "server.example.com",
  "tests": {
    "dns": {
      "success": true,
      "addresses": ["192.168.1.100"],
      "message": "Resolved to: 192.168.1.100"
    },
    "rdp": {
      "success": false,
      "error": "timeout",
      "message": "Connection to port 3389 timed out"
    },
    "control": {
      "success": true,
      "message": "Control port 443 is open and reachable"
    }
  },
  "verdict": {
    "verdict": "Zscaler/Firewall blocking RDP",
    "explanation": "DNS resolves and control channels work, but RDP port times out...",
    "recommendation": "Check Zscaler application policies for RDP blocking..."
  }
}
```

### GET /api/health
Health check endpoint.

## Development

To run in development mode with auto-restart:

```bash
npm run dev
```

## Troubleshooting

### Common Issues

1. **"Test Failed" Error**
   - Check if the server is running
   - Verify the domain name is correct
   - Check network connectivity

2. **DNS Resolution Fails**
   - Verify the domain exists
   - Check if it's accessible from your network
   - Try with a different DNS server

3. **All Tests Timeout**
   - Check if the target server is running
   - Verify network connectivity
   - Check firewall rules

### Logs

Check the server console for detailed logs of each test step.

## Security Notes

- This tool only tests connectivity, it doesn't attempt to authenticate
- No sensitive data is stored or logged
- Tests are performed from the server's network perspective
- Consider running this from the same network as your Guacamole server for accurate results

## License

MIT License
