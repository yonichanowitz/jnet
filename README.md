# README

## Description

JNet SMS service

this app uses express.js, twilio, and mondays.com to send SMS messages to a list of phone numbers.
the phone numbers are stored in a mondays.com board, and the app will send a message to each number in the board, who meets the criteria of the board's filter.
the app will send the message to each number, and will update the board with the status of the message (either "Yes" or "No".)

Mondays.com uses GraphQL , which can only use POST or GET requests, so the app uses POST requests to send the message to the numbers.
the board is queried, and the app will send the message to each number, 
it then updates the board's corresponding column of each user by adding 1 to the column's "Yes" value if Yes, or 1 to the "No" column if No.



## Installation

with docker:

1) build the image. in terminal run `docker build -t jnet-sms .`
2) 

### Prerequisites
make sure .env file is set up
make sure nodejs is installed

* [Node.js](https://nodejs.org/en/) (v8.11.3)

### Instructions

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run` to start the servers

files:

