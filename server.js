const express = require('express');
const dns = require('dns').promises;
const net = require('net');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const ping = require('ping');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// DNS resolution test
async function testDNS(domain) {
    try {
        const addresses = await dns.resolve4(domain);
        return { 
            success: true, 
            addresses: addresses,
            message: `Resolved to: ${addresses.join(', ')}`
        };
    } catch (error) {
        return { 
            success: false, 
            error: error.message,
            message: `DNS resolution failed: ${error.message}`
        };
    }
}

// ICMP ping test
async function testPing(domain) {
    try {
        const result = await ping.promise.probe(domain, {
            timeout: 5,
            extra: ['-c', '3'] // Send 3 ping packets
        });
        
        if (result.alive) {
            return {
                success: true,
                message: `Ping successful - ${result.time}ms average`,
                time: result.time,
                packets: result.output
            };
        } else {
            return {
                success: false,
                error: 'ping_failed',
                message: 'Ping failed - host unreachable',
                packets: result.output
            };
        }
    } catch (error) {
        return {
            success: false,
            error: 'ping_error',
            message: `Ping error: ${error.message}`,
            packets: ''
        };
    }
}

// Test service port connectivity (RDP 3389 or SSH 22)
async function testServicePort(domain, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 5000; // 5 seconds
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ 
                success: true, 
                message: `Port ${port} is open and reachable`
            });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ 
                success: false, 
                error: 'timeout',
                message: `Connection to port ${port} timed out`
            });
        });
        
        socket.on('error', (error) => {
            socket.destroy();
            if (error.code === 'ECONNREFUSED') {
                resolve({ 
                    success: false, 
                    error: 'connection_refused',
                    message: `Port ${port} is closed or filtered`
                });
            } else if (error.code === 'EHOSTUNREACH') {
                resolve({ 
                    success: false, 
                    error: 'host_unreachable',
                    message: `Host ${domain} is unreachable`
                });
            } else {
                resolve({ 
                    success: false, 
                    error: 'network_error',
                    message: `Network error: ${error.message}`
                });
            }
        });
        
        socket.connect(port, domain);
    });
}

// Test control port (typically 443 for HTTPS or 80 for HTTP)
async function testControlPort(domain, port = 443) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 3000; // 3 seconds
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ 
                success: true, 
                message: `Control port ${port} is open and reachable`
            });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ 
                success: false, 
                error: 'timeout',
                message: `Control port ${port} timed out`
            });
        });
        
        socket.on('error', (error) => {
            socket.destroy();
            if (error.code === 'ECONNREFUSED') {
                resolve({ 
                    success: false, 
                    error: 'connection_refused',
                    message: `Control port ${port} is closed`
                });
            } else {
                resolve({ 
                    success: false, 
                    error: 'network_error',
                    message: `Control error: ${error.message}`
                });
            }
        });
        
        socket.connect(port, domain);
    });
}

// Determine verdict based on test results and protocol
function determineVerdict(dnsResult, pingResult, serviceResult, controlResult, protocol = 'rdp') {
    const dnsSuccess = dnsResult.success;
    const pingSuccess = pingResult.success;
    const serviceSuccess = serviceResult.success;
    const serviceTimeout = serviceResult.error === 'timeout';
    const controlSuccess = controlResult.success;
    
    const serviceName = protocol === 'ssh' ? 'SSH' : 'RDP';
    const servicePort = protocol === 'ssh' ? '22' : '3389';

    if (!dnsSuccess) {
        return {
            verdict: "Domain blocked by DNS policy",
            explanation: `Zscaler is blocking DNS resolution for this domain, preventing any connection attempts. The user will not be able to connect to this server through your ${protocol.toUpperCase()} proxy.`,
            recommendation: `Check Zscaler DNS policies and whitelist this domain if ${serviceName} access should be allowed.`
        };
    }

    if (!pingSuccess) {
        return {
            verdict: "Host unreachable (ICMP blocked)",
            explanation: `DNS resolves but ICMP ping fails. This suggests Zscaler or firewall is blocking ICMP traffic, which may indicate broader network restrictions.`,
            recommendation: `Check Zscaler policies for ICMP blocking. Even if ${serviceName} works, network diagnostics may be limited.`
        };
    }

    if (serviceSuccess) {
        return {
            verdict: `${serviceName} port reachable`,
            explanation: `The ${serviceName} port (${servicePort}) is accessible and ping works, suggesting Zscaler allows ${serviceName} connections to this server. Your ${protocol.toUpperCase()} proxy should work normally.`,
            recommendation: `${serviceName} access should work through your proxy. Monitor for any policy changes.`
        };
    }

    if (serviceTimeout && controlSuccess) {
        return {
            verdict: `Zscaler/Firewall blocking ${serviceName}`,
            explanation: `DNS resolves, ping works, and control channels work, but ${serviceName} port times out. This suggests Zscaler or firewall is specifically blocking ${serviceName} traffic while allowing other protocols.`,
            recommendation: `Check Zscaler application policies for ${serviceName} blocking. May need to whitelist ${serviceName} protocol or specific ports.`
        };
    }

    if (serviceTimeout && !controlSuccess) {
        return {
            verdict: "Indeterminate (could be server down)",
            explanation: `DNS resolves and ping works, but both ${serviceName} and control channels timeout. This could indicate server is down or specific services are not running.`,
            recommendation: "Verify server is running and accessible. Check if specific services are configured correctly."
        };
    }

    if (!serviceSuccess && controlSuccess) {
        return {
            verdict: `Likely ${serviceName} port reachable`,
            explanation: `${serviceName} port shows connection refused but control channel works and ping succeeds. This suggests the ${serviceName} port is reachable but may not be running ${serviceName} service or is filtered.`,
            recommendation: `Verify ${serviceName} service is running on the target server. Check if port ${servicePort} is configured correctly.`
        };
    }

    return {
        verdict: "Connection failed",
        explanation: "Unable to establish any connection to the server. This could be due to server being down, network issues, or Zscaler blocking all access.",
        recommendation: "Check server status, network connectivity, and Zscaler policies for this domain."
    };
}

// API endpoint for testing connectivity
app.post('/api/test-connectivity', async (req, res) => {
    const { domain, protocol = 'rdp' } = req.body;
    
    if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
    }

    // Validate protocol
    const validProtocols = ['rdp', 'ssh'];
    if (!validProtocols.includes(protocol.toLowerCase())) {
        return res.status(400).json({ error: 'Protocol must be either "rdp" or "ssh"' });
    }

    const protocolLower = protocol.toLowerCase();
    const servicePort = protocolLower === 'ssh' ? 22 : 3389;
    const serviceName = protocolLower === 'ssh' ? 'SSH' : 'RDP';

    console.log(`Testing ${serviceName} connectivity for domain: ${domain}`);

    try {
        // Run all tests in parallel
        const [dnsResult, pingResult, serviceResult, controlResult] = await Promise.all([
            testDNS(domain),
            testPing(domain),
            testServicePort(domain, servicePort),
            testControlPort(domain, 443)
        ]);

        // Determine verdict based on protocol
        const verdict = determineVerdict(dnsResult, pingResult, serviceResult, controlResult, protocolLower);

        const results = {
            domain,
            protocol: protocolLower,
            tests: {
                dns: dnsResult,
                ping: pingResult,
                service: {
                    ...serviceResult,
                    port: servicePort,
                    name: serviceName
                },
                control: controlResult
            },
            verdict
        };

        console.log('Test results:', JSON.stringify(results, null, 2));
        res.json(results);

    } catch (error) {
        console.error('Test failed:', error);
        res.status(500).json({ 
            error: 'Test failed', 
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Zscaler RDP/SSH Connectivity Tester with Ping running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
