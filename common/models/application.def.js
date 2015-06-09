"use strict";

module.exports = function (t) {
    return {
        properties: {
            id: {type: String},
            // Basic information
            name: {type: String, index: true, required: true}, // The name
            description: String, // The description
            icon: String, // The icon image url

            owner: String, // The user id of the developer who registers the application
            collaborators: [String], // A list of users ids who have permissions to work on this app

            // EMail
            email: String, // e-mail address
            emailVerified: Boolean, // Is the e-mail verified

            // oAuth 2.0 settings
            url: String, // The application url
            callbackUrls: [String], // oAuth 2.0 code/token callback url
            permissions: [String], // A list of permissions required by the application

            // Keys
            clientKey: String,
            javaScriptKey: String,
            restApiKey: String,
            windowsKey: String,
            masterKey: String,

            // Push notification
            pushSettings: t.JSON,

            // User Authentication
            authenticationEnabled: {type: Boolean, default: true},
            anonymousAllowed: {type: Boolean, default: true},
            authenticationSchemes: [t.JSON],

            status: {type: String, default: 'sandbox'}, // Status of the application, production/sandbox/disabled

            // Timestamps
            created: {type: Date, default: function () { return new Date;}},
            updated: {type: Date, default: function () { return new Date;}}
        }
    }
};