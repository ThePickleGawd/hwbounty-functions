const functions = require("firebase-functions");
const app = require("express")();
const FBAuth = require("./util/fbAuth.js");

const cors = require("cors");
app.use(cors());

const { db } = require("./util/admin");

const {
  getAllBounties,
  postOnce,
  getBounty,
  commentOnBounty,
  likeBounty,
  unLikeBounty,
  deleteBounty,
} = require("./handlers/bounties");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");

// Bounty Routes
app.get("/bounties", getAllBounties);
app.post("/post", FBAuth, postOnce);
app.get("/bounty/:bountyId", getBounty);
app.delete("/bounty/:bountyId", FBAuth, deleteBounty);
app.get("/bounty/:bountyId/like", FBAuth, likeBounty);
app.get("/bounty/:bountyId/unlike", FBAuth, unLikeBounty);
app.post("/bounty/:bountyId/comment", FBAuth, commentOnBounty);

//Users Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
  .region("us-central1")
  .firestore.document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/bounties/${snapshot.data().bountyId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            bountyId: doc.id,
            notificationId: snapshot.id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region("us-central1")
  .firestore.document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions
  .region("us-central1")
  .firestore.document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/bounties/${snapshot.data().bountyId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            bountyId: doc.id,
            notificationId: snapshot.id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return;
      });
  });

exports.onUserImageChange = functions
  .region("us-central1")
  .firestore.document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("image has changed");
      const batch = db.batch();
      return db
        .collection("bounties")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const bounty = db.doc(`/bounties/${doc.id}`);
            batch.update(bounty, {
              userImage: change.after.data().imageUrl,
            });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onBountyDelete = functions
  .region("us-central1")
  .firestore.document("/bounties/{bountyId}")
  .onDelete((snapshot, context) => {
    const bountyId = context.params.bountyId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("bountyId", "==", bountyId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection("likes")
          .where("bountyId", "==", bountyId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("bountyId", "==", bountyId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
