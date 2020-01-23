const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./util/fbAuth.js');

const {
    getAllBounties,
    postOnce,
    getBounty,
    commentOnBounty,
    likeBounty,
    unLikeBounty
} = require('./handlers/bounties');
const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser
} = require('./handlers/users');

// Bounty Routes
app.get('/bounties', getAllBounties);
app.post('/post', FBAuth, postOnce);
app.get('/bounty/:bountyId', getBounty);


//TODO: delete post once
app.get('/bounty/:bountyId/like', FBAuth, likeBounty);
app.get('/bounty/:bountyId/unlike', FBAuth, unLikeBounty);
app.post('/bounty/:bountyId/comment', FBAuth, commentOnBounty);


//Users Routes
app.post("/signup", signup);
app.post("/login", login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);