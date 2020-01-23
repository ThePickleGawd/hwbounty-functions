const {
    db
} = require('../util/admin')

exports.getAllBounties = (req, res) => {
    db
        .collection('bounties')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let posts = [];
            data.forEach(doc => {
                posts.push({
                    bountyId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            });
            return res.json(posts);
        })
        .catch(err => console.error(err));
}

exports.postOnce = (req, res) => {
    if (req.method !== 'POST') {
        return res.status(400).json({
            error: 'Method Not Allowed'
        });
    }
    const newPost = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    db
        .collection('bounties')
        .add(newPost)
        .then((doc) => {
            const resBounty = newPost;
            resBounty.bountyId = doc.id;
            res.json(resBounty);
        })
        .catch((err) => {
            res.status(500).json({
                error: 'something went wrong'
            });
            console.error(err);
        })
}

//Fetch one bounty
exports.getBounty = (req, res) => {
    let bountyData = {};
    db.doc(`/bounties/${req.params.bountyId}`)
        .get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: 'Bounty not found'
                });
            }
            bountyData = doc.data();
            bountyData.bountyId = doc.id;
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('bountyId', '==', req.params.bountyId)
                .get();
        })
        .then(data => {
            bountyData.comments = [];
            data.forEach(doc => {
                bountyData.comments.push(doc.data());
            });
            return res.json(bountyData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({
                error: err.code
            });
        })
}

// Comment on a bounty
exports.commentOnBounty = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({
        error: 'Must not be empty'
    });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        bountyId: req.params.bountyId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/bounties/${req.params.bountyId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: 'Bounty not found'
                });
            }
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            res.json(newComment);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({
                error: 'Something went wrong'
            });
        });
}

// Like a bounty
exports.likeBounty = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('bountyId', '==', req.params.bountyId).limit(1);

    const bountyDocument = db.doc(`/bounties/${req.params.bountyId}`);

    let bountyData = {};

    bountyDocument
        .get()
        .then(doc => {
            if (doc.exists) {
                bountyData = doc.data();
                bountyData.bountyId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({
                    error: 'bounty not found'
                });
            }
        }).then(data => {
            if (data.empty) {
                return db.collection('likes').add({
                        bountyId: req.body.bountyId,
                        userHandle: req.user.handle
                    })
                    .then(() => {
                        bountyData.likeCount++;
                        return bountyDocument.update({
                                likeCount: bountyData.likeCount
                            })
                            .then(() => {
                                return res.json({
                                    bountyData
                                });
                            });
                    })
            } else {
                return res.status(400).json({
                    error: 'Bounty already liked'
                });
            }
        }).catch(err => {
            console.log(err);
            res.status(500).json({
                error: err.code
            });
        })
}

exports.unLikeBounty = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('bountyId', '==', req.params.bountyId).limit(1);

    const bountyDocument = db.doc(`/bounties/${req.params.bountyId}`);

    let bountyData = {};

    bountyData.get().then(doc => {
        if (doc.exists) {
            bountyData = doc.data();
            bountyData.bountyId.get();
        } else {
            return res.status(404).json({
                error: 'bounty not found'
            });
        }
    }).then(data => {
        if (data.empty) {
            return res.status(400).json({
                error: 'Bounty not liked'
            });
        } else {
            return db.doc(`/likes/${data.docs[0].id}`).delete()
                .then(() => {
                    bountyData.likeCount--;
                    return bountyDocument.update({
                        likeCount: bountyData.likeCount
                    });
                })
                .then(() => {
                    return res.json(bountyData);
                })
        }
    }).catch(err => {
        console.log(err);
        res.status(500).json({
            error: err.code
        });
    })
}