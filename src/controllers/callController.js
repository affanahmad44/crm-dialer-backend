const callService = require("../services/callService");

const makeCall = async (req, res) => {

    try {

        const response =
            await callService.makeCall(req.body);

        res.status(200).json(response);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

const hangupCall = async (req, res) => {

    try {

        const response =
            await callService.hangupCall(req.body);

        res.status(200).json(response);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

const holdCall = async (req, res) => {

    try {

        const response =
            await callService.holdCall(req.body);

        res.status(200).json(response);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

const unholdCall = async (req, res) => {

    try {

        const response =
            await callService.unholdCall(req.body);

        res.status(200).json(response);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

const transferCall = async (req, res) => {

    try {

        const response =
            await callService.transferCall(req.body);

        res.status(200).json(response);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

const activeCalls = async (req, res) => {

    try {

        const response =
            await callService.activeCalls();

        res.status(200).json(response);

    } catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

};

module.exports = {

    makeCall,
    hangupCall,
    holdCall,
    unholdCall,
    transferCall,
    activeCalls

};