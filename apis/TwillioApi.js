const MessagingResponse = require('twilio').twiml.MessagingResponse;
const { updateMondayItem, getPhoneList, stopMessageMutation } = require('./MondayApi.js');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const https = require('https');

let fromNumber = ""
// regex that looks for either the word 'yes' or 'y'
const yesWord = /(y|yes)+/gi;
const noWord = /(n|no)+/gi

async function sendMessages(phoneNumber) {
    console.log(phoneNumber);
    // phoneList variable changes for testing purposes
    let phoneList = Array.isArray(phoneNumber) ? {domestic: phoneNumber.map( (number) => {return  {name: "yoni", phoneNumber: number}})} : await getPhoneList();
    console.log(phoneList);
    phoneList.domestic.forEach(contact => {
        const message = `Hello ${contact.name} it's your weekly check-in with JNet! Kindly let us know if you studied with your partner this week by replying 'Y' for yes or 'N' for no. Your dedication fuels the success of our community. Thank you for being a vital part of JNet! To stop these reminders, reply 'STOP'.`;
        client.messages.create({
            body: message,
            to: '+1'+contact.phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
        }).then(message => console.log(message.sid))
        .catch(err => console.error(err));
    });
    // if there are international contacts, send them a message via WhatsApp
    // phoneList.international ? phoneList.international.forEach(contact => {
    //     console.log(`contact ${contact} is being sent a message`);
    //     const message = `Hello ${contact.name} it's your weekly check-in with JNet! Kindly let us know if you studied with your partner this week by replying 'Y' for yes or 'N' for no. Your dedication fuels the success of our community. Thank you for being a vital part of JNet! To stop these reminders, reply 'STOP'.`;
    //     https.headers = {
    //         'Content-Type': 'application/json',
    //         'Authorization': 'Bearer ' + process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    //     }
    //     https.body = {
    //         data: `{ \"messaging_product\": \"whatsapp\", \"to\": \"${contact.phoneNumber}\", \"type\": \"template\", \"template\": { \"${contact.name}\": \"${message}\", \"language\": { \"code\": \"en_US\" } } }`
    //     }
    //     https.post('https://graph.facebook.com/v18.0/273505975835946/messages')
    //     .then(message => console.log(message.sid))
    //     .catch(err => console.error(err));
    // }) : '';
    
}
async function listenForSMS(req, res) {
    //regex that catches the word "stop 
    const stopWord = /stop/gi;
    const twiml = new MessagingResponse();
    const messageBody = req.body.Body.trim().toLowerCase();
    // if the first charachters in fromNumber are "+1" remove them
    fromNumber = req.body.From.startsWith("+1") ? req.body.From.slice(2) : req.body.From;

    // Access the message body and the number it was sent from.
    console.log(`Incoming message from ${req.body.From}: ${req.body.Body}`);

    

    try {
        if (messageBody.match(yesWord)) {
            updateMondayItem(fromNumber, 'y');
            twiml.message('Thank you for your response! Your commitment to connecting with your study partner is appreciated. Your ongoing support strengthens the JNet community. If you have any questions or need assistance, feel free to reach out. Keep up the great work!');
        } else if (messageBody.match(noWord)) {
            updateMondayItem(fromNumber, 'n');
            twiml.message('Hi, thanks for letting us know. Your dedication means a lot to us at JNet. If you need any support, just reach out. Have a great day!');
        }else if (messageBody.match(stopWord)) {
            stopMessageMutation(fromNumber);
            twiml.message('You have been unsubscribed from JNet reminders. If you would like to resubscribe, please reach out to us at JNet. Have a great day!');
        } else {
            twiml.message('Invalid response, please respond with either "Y", "N" or "STOP"');
        }

    } catch (error) {
        console.error('Error:', error);
    }
    res.type('text/xml').send(twiml.toString());
}

module.exports = {sendMessages, listenForSMS};