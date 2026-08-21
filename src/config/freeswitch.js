module.exports = {

    // Tailscale SOCKS5 proxy
    socksHost: process.env.TS_SOCKS_HOST || "127.0.0.1",
    socksPort: Number(process.env.TS_SOCKS_PORT || 1055),

    // FreeSWITCH ESL destination
    host: process.env.FS_HOST || "100.88.225.6",
    port: Number(process.env.FS_PORT || 8021),

    // FreeSWITCH ESL password
    password: process.env.FREESWITCH_PASSWORD,

    // SOCKS5 connection timeout
    timeout: Number(process.env.FS_CONNECTION_TIMEOUT || 15000)

};
