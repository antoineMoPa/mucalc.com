# Users, session, etc.

## login

When a user 

## session_id

This is stored in a cookie and is currently valid for one login.

We have to validate if the session really exists in redis at each request.

## public_id (sometimes user_id in frontend code)

public_id in the server side is the same thing as user_id in the frontend side.

It allows, for example, to identify who as sent what message, who is editing what cell, etc.

Previously, public_id and user_id used to be updatable by frontend, but this should never be the case anymore.

## Ideas to prevent session hijacking

Change the session_id at each page load.

See: [this wikipedia article](https://en.wikipedia.org/wiki/Session_hijacking#Prevention)

## What happens when a user logs in

Example of a successful login and sheet interaction.

* User logins, password is matched to mongodb password
* Session is created, cookie with id is sent
* Data is fetched from mongo and put in redis
* User goes to a sheet
* Socket.io connection and cookie reception
* Verify if session exists
* Add user to memory
* Send nickname and public_id to client
* Past messages are loaded in chat, messages where
  `public id == current user id`
  are highlighted as own-message.
* etc.