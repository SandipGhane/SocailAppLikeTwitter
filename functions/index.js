const functions = require('firebase-functions');
const app=require('express')()
const {db} = require('./utils/admin')
const {
        getAllScreams,
        postOneScream,
        getScream,
        commentOnScream,
        likeScream,
        unlikeScream,
        deleteScream
}=require('./handlers/screams')
//const {postOneScream}=require('./handlers/screams')
const {
        signup,
        login,
        uploadImage,
        addUserDetails,
        getAuthenticatedUser,
        getUserDetails,
        markNotificationsRead,
       //signUpGoogle

}=require('./handlers/users')

const FBAuth=require('./utils/fbAuth')

//scream routes
app.get('/screams',getAllScreams);
app.post('/createScream',FBAuth,postOneScream);
app.get('/createScream/:screamId',getScream);
app.get('/createScream/:screamId/like',FBAuth,likeScream)
app.get('/createScream/:screamId/unlike',FBAuth,unlikeScream)
app.post('/createScream/:screamId/comment',FBAuth,commentOnScream);
app.delete('/createScream/:screamId',FBAuth,deleteScream)


//user routes
app.post('/signup',signup)
//app.post('/signUpGoogle',signUpGoogle)
app.post('/login',login)
app.post('/user/uploadImage',FBAuth,uploadImage)
app.post('/user',FBAuth,addUserDetails)
app.get('/user',FBAuth,getAuthenticatedUser);
app.get('/user/:handle',getUserDetails)
app.post('/notification',FBAuth,markNotificationsRead)

exports.api=functions.region('asia-east2').https.onRequest(app)

exports.createNotificationOnLike = functions
  .region('asia-east2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
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
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
        return
      })
      .catch((err) => console.error(err));
  });
exports.deleteNotificationOnUnLike = functions
  .region('asia-east2')
  .firestore.document('likes/{id}')
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
  .region('asia-east2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
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
            type: 'comment',
            read: false,
            screamId: doc.id
          });
        }
        return
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });


exports.onUserImageChane=functions
.region('asia-east2')
.firestore.document('users/{userId}')
.onUpdate((change)=>{
    console.log(change.before.data())
    console.log(change.after.data())

    if(change.before.data().imgUrl !== change.after.data().imgUrl){
        console.log('image has changed')
        let batch=db.batch()

        return db
        .collection('screams')
        .where('userHandle','==',change.before.data.handle)
        .get()
        .then((data)=>{
            data.forEach((doc)=>{
                const scream=db.doc(`/screams/${doc.id}`);
                batch.update(scream,{userImage:change.after.data().imgUrl})
            })
            return batch.commit()
        })
    }
})

exports.onScreamDelete=functions
.region('asia-east2')
.firestore.document('screams/{screamId}')
.onDelete((snapshot,context)=>{
    const screamId=context.params.screamId
    const batch=db.batch()
    return db.collection('comments').where('screamId','==',screamId).get()
        .then(data=>{
            data.forEach(doc=>{
                batch.delete(db.doc(`/comments/${doc.id}`))
            })
            return db.collection('likes').where('screamId','==',screamId)
        })
        .then(data=>{
            data.forEach(doc=>{
                batch.delete(db.doc(`/likes/${doc.id}`))
            })
            return db.collection('notifications').where('screamId','==',screamId)
        })
        .then(data=>{
            data.forEach(doc=>{
                batch.delete(db.doc(`/notifications/${doc.id}`))
            })
            return batch.commit()
        })
        .catch(err=>{
            console.error(err)
        })
})