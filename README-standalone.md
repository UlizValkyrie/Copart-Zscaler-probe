# Zscaler RDP/SSH Connectivity Tester (Client-Side)

A **standalone web application** that tests RDP/SSH server connectivity through Zscaler ZPA policies directly in your browser. No backend server required!

## 🚀 Key Features

- **100% Client-Side**: All tests run in your browser
- **No Backend Required**: Just open the HTML file or use a simple HTTP server
- **Dual Protocol Support**: Test both RDP (Windows) and SSH (Linux)
- **ICMP Ping Simulation**: Uses HTTP timing to estimate connectivity
- **Real-Time Results**: Instant feedback on connectivity status
- **Zscaler Policy Detection**: Determines if Zscaler will block connections

## 📊 Test Matrix

| DNS     | Ping    | Service Port | Control Port | Verdict                              |
| ------- | ------- | ------------ | ------------ | ------------------------------------ |
| Fail    | N/A     | N/A          | N/A          | Domain blocked by DNS policy         |
| Success | Fail    | N/A          | N/A          | Host unreachable (ICMP blocked)      |
| Success | Success | Connected    | Works        | Service port reachable               |
| Success | Success | Timeout      | Works        | Zscaler/Firewall blocking service    |
| Success | Success | Timeout      | Fails        | Indeterminate (could be server down) |
| Success | Success | Refused      | Works        | Service not running                  |

## 🛠️ Installation & Usage

### Option 1: Simple HTTP Server (Recommended)
```bash
# Install dependencies
npm install

# Start the server
./start-standalone.sh
# OR
node simple-server.js

# Open http://localhost:3000
```

### Option 2: Direct File Access
```bash
# Just open the HTML file directly in your browser
open index.html
# OR
# Double-click index.html in your file manager
```

## 🔧 How It Works

### Client-Side Testing Methods:

1. **DNS Resolution**: Uses DNS-over-HTTPS (Google DNS) to resolve domains
2. **Ping Simulation**: Uses HTTP request timing to estimate latency
3. **Port Testing**: Uses WebSocket connections to test port accessibility
4. **Control Channel**: Tests HTTPS (port 443) for control channel availability

### Browser Limitations:

Due to browser security restrictions:
- **CORS Policies**: Some tests may show "connection refused" even for open ports
- **Mixed Content**: HTTPS sites may block HTTP requests
- **WebSocket Limitations**: Some ports may not respond to WebSocket connections
- **ICMP Simulation**: Uses HTTP timing instead of true ICMP ping

## 🎯 Usage Instructions

1. **Select Protocol**: Choose Windows (RDP) or Linux (SSH)
2. **Enter Domain**: Type the server domain name
3. **Run Test**: Click "Run Test" or press Enter
4. **Review Results**: Check the verdict and recommendations

## 📋 Test Results Explained

### DNS Resolution
- **Success**: Domain resolves to IP addresses
- **Failed**: Zscaler likely blocking DNS resolution

### ICMP Ping
- **Success**: Host responds to HTTP requests (estimated latency)
- **Failed**: Host unreachable or ICMP blocked

### Service Port (RDP 3389 / SSH 22)
- **Connected**: Port is open and accessible
- **Timeout**: Port filtered or blocked by Zscaler
- **Refused**: Port closed or service not running

### Control Port (443)
- **Connected**: HTTPS control channel works
- **Failed**: Control channel blocked or unavailable

## ⚠️ Important Notes

### Browser Security Limitations:
- This tool runs entirely in your browser
- Some tests may not work due to CORS policies
- Results may be less accurate than server-side testing
- For production use, consider running from a server environment

### Zscaler Policy Detection:
- DNS blocking is accurately detected
- Port blocking detection depends on browser capabilities
- ICMP simulation provides estimated results
- Control channel testing works well for HTTPS

## 🔍 Troubleshooting

### Common Issues:

1. **"All tests failed"**
   - Check if the domain is correct
   - Verify network connectivity
   - Try a different browser

2. **"CORS errors"**
   - Normal for some ports
   - Doesn't necessarily mean the port is closed
   - Focus on DNS and control port results

3. **"Ping failed"**
   - May indicate ICMP blocking
   - Check if the host responds to HTTP requests
   - Look at other test results for context

### For Accurate Results:
- Run from the same network as your Guacamole server
- Test during normal business hours
- Try multiple browsers if results seem inconsistent
- Consider using the server-side version for production

## 📁 File Structure

```
ZscalerTest/
├── index.html              # Main application (standalone)
├── simple-server.js        # Simple HTTP server
├── start-standalone.sh     # Easy startup script
├── package.json            # Dependencies
└── README-standalone.md    # This file
```

## 🚀 Quick Start

```bash
# Clone or download the files
cd ZscalerTest

# Install dependencies (if using HTTP server)
npm install

# Start the application
./start-standalone.sh

# Open http://localhost:3000 in your browser
```

## 🎯 Perfect For:

- **Quick Testing**: Fast, no-server-required connectivity checks
- **Development**: Easy to modify and customize
- **Demonstrations**: Show Zscaler policy effects instantly
- **Troubleshooting**: Quick diagnosis of connectivity issues

## 📝 License

MIT License - Feel free to modify and distribute!

---

**Note**: This is a client-side tool with browser limitations. For production environments or more accurate results, consider using the server-side version or running this from a server environment.
