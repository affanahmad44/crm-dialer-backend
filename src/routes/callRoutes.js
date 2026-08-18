const express = require("express");

const router = express.Router();

const {

    makeCall,
    hangupCall,
    holdCall,
    unholdCall,
    transferCall,
    activeCalls

} = require("../controllers/callController");

router.post("/", makeCall);

router.post("/hangup", hangupCall);

router.post("/hold", holdCall);

router.post("/unhold", unholdCall);

router.post("/transfer", transferCall);

router.get("/active", activeCalls);

module.exports = router;