/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const fetch = require('node-fetch');

// todo: instructions to read these from the environment
const appId = process.env.appId;
const appCode = process.env.appCode;
const tableName = process.env.tableName;

var speechText;

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    // todo: add code that reads from the VehicleTripTable
    // todo: add instructions for updating the IAM role for the Lambda function
    // todo: add environment variables inside Lambda function
    // -------------
    AWS.config.update({
      region: "us-east-1"
    });

    var docClient = new AWS.DynamoDB.DocumentClient();

    console.log("Scanning DynamoDB VehicleTripTable directly for trips...");

    var params = {
      TableName: tableName
    };

    docClient.scan(params, onScan);

    async function onScan(err, data) {
      if (err) {
        console.error("Unable to scan the table. Error:", JSON.stringify(err, null, 2));
        return;
      }

      // print trip info
      speechText = "Hi there! I found a total of " + data.Count + " trips in your profile. ";
      speechText += "<break time='500ms'/>"

      // sort the trip by start_time, most recent first
      var trips = data.Items;
      trips.sort(function(a, b) {
        return (b.start_time > a.start_time);
      });

      // print the 3 most recent trips
      speechText += "Your 3 most recent trips were: "
      var url; // url to call HERE Maps reverse geocoder API
      var i = 0; // index of the trip
      var response; // response from HERE Maps API
      var data; // encoded response
      var locationData; // JSON response
      var latitude;
      var longitude;
      var neighborhood; // neighborhood string extracted from response

      console.log("Getting three most recent trips...");
      for (i = 0; i < 3; i++) {
        latitude = trips[i].latitude;
        longitude = trips[i].longitude;

        url = "https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?app_id=" + appId + "&app_code=" + appCode + "&mode=retrieveAreas&prox=" + latitude + "," + longitude;
        response = await fetch(url);
        locationData = await (response.json());
        neighborhood = locationData.Response.View[0].Result[0].Location.Address.Label;

        // we use i+1 so that Alexa describes the trip number begins at 1 instead of 0
        speechText += "<break time='500ms'/>"
        var tripNumber = i + 1
        speechText += "Trip number " + tripNumber + ", "
        speechText += "<break time='250ms'/>"
        speechText += " A " + trips[i].odometer.toFixed(1) + " mile trip near " + neighborhood
        speechText += "; "
        speechText += "<break time='500ms'/>"

      } // for(i)
    } // async onScan()

    let response = await handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();

    return response;
  }, // async handle()
}; // LaunchRequestHandler()

const HelloWorldIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
  },
  async handle(handlerInput) {
    speechText = "In HelloWorldEventHandler";

    return handlerInput.responseBuilder.speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
