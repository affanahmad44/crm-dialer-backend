const eslService = require("./eslService");

const makeCall = async ({ destination }) => {

    if (!destination)
        throw new Error("Destination number is required.");

    const callerId = process.env.TWILIO_CALLER_ID;

    if (!callerId)
        throw new Error("TWILIO_CALLER_ID is not configured.");

    const command =
        `originate {origination_caller_id_number=${callerId}}sofia/gateway/twilio/${destination} &park`;

    const result =
        await eslService.executeApi(command);

    return {
        success: true,
        message: "Call initiated successfully.",
        payload: result
    };
};

const hangupCall = async ({ uuid }) => {

    if (!uuid)
        throw new Error("UUID required.");

    const result = await eslService.executeApi(
        `uuid_kill ${uuid}`
    );

    return {
        success: true,
        message: "Call disconnected.",
        payload: result
    };
};

const holdCall = async ({ uuid }) => {

    if (!uuid)
        throw new Error("UUID required.");

    const result = await eslService.executeApi(
        `uuid_hold ${uuid}`
    );

    return {
        success: true,
        message: "Call placed on hold.",
        payload: result
    };
};

const unholdCall = async ({ uuid }) => {

    if (!uuid)
        throw new Error("UUID required.");

    const result = await eslService.executeApi(
        `uuid_hold off ${uuid}`
    );

    return {
        success: true,
        message: "Call resumed.",
        payload: result
    };
};

const transferCall = async ({ uuid, destination }) => {

    if (!uuid || !destination)
        throw new Error("UUID and destination required.");

    const result = await eslService.executeApi(
        `uuid_transfer ${uuid} ${destination} XML default`
    );

    return {
        success: true,
        message: "Call transferred.",
        payload: result
    };
};

const activeCalls = async () => {

    const result = await eslService.executeApi(
        "show channels"
    );

    return {
        success: true,
        payload: result
    };
};

module.exports = {

    makeCall,
    hangupCall,
    holdCall,
    unholdCall,
    transferCall,
    activeCalls

};