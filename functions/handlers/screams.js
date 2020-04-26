const {db} = require('../utils/admin')


//show all screams

exports.getAllScreams=(req,res)=>{
    db.collection('screams').orderBy('createdAt','desc').get()
    .then(data=>{
        let screams=[];
        data.forEach(doc=>{
            console.log(doc.id)
            screams.push({
                screamId:doc.id,
                body:doc.data().body,
                userHandle:doc.data().userHandle,
                createdAt:doc.data().createdAt,
                userImage:doc.data().userImage,
                commentCount:doc.data().commentCount,
                likeCount:doc.data().likeCount
            });
        });
        return res.json(screams)
    })
    .catch(err=>console.log(err))
}


//post Screams

exports.postOneScream=(req,res)=>{
    if(req.method!=='POST')
    {
        return res.status(400).json({error:'method not allowed'})
    }
    const newData={
        body:req.body.body,
        userHandle:req.user.handle,
        userImage:req.user.imgUrl,
        createdAt:new Date().toISOString(),
        likeCount:0,
        commentCount:0

    }
    db.collection('screams').add(newData)
    .then((data)=>{
        const resScream=newData
        resScream.screamId=data.id
        res.json({resScream});
        return null;
    })
    .catch((err)=>{
        res.status(500).json({error:'something went wrong'})
        console.error(err)
    })
}


//get all screams
exports.getScream=(req,res)=>{
    let screamData={}

    db.doc(`/screams/${req.params.screamId}`).get()
    .then((doc)=>{
        if(!doc.exists){
            return res.status(400).json({error:'Scream not found'})
        }
        screamData=doc.data()
        screamData.screamId=doc.id
        return db
        .collection('comments')
        .orderBy('createdAt','desc')
        .where('screamId','==',req.params.screamId)
        .get()
    }).then((data)=>{
        screamData.comments=[]
        data.forEach((doc)=>{
            screamData.comments.push(doc.data())
        })
        return res.json(screamData)
    }).catch((err)=>{
        console.error(err)
        res.status(500).json({error:err.code})
    })
}

//comment on scream

exports.commentOnScream=(req,res)=>{
    if(req.body.body.trim()===''){
        return res.status(500).json({comment:'comment must not be empty'})
    }
    const newComment={
        body:req.body.body,
        createdAt:new Date().toISOString(),
        screamId:req.params.screamId,
        userHandle:req.user.handle,
        userImage:req.user.imgUrl
    }
    db.doc(`/screams/${req.params.screamId}`).get()
    .then((doc)=>{
        if(!doc.exists){
            return res.status(500).json({message:'scream not found'})
        }
        return doc.ref.update({commentCount:doc.data().commentCount+1})
    }).then(()=>{
        return db.collection('comments').add(newComment)
    }).then(()=>{
        return res.json(newComment)
    }).catch((err)=>{
        console.error(err);
        res.status(500).json({message:'something went wrong'})
    })
}


//like post
exports.likeScream = (req, res) => {
    const likeDocument = db
      .collection('likes')
      .where('userHandle', '==', req.user.handle)
      .where('screamId', '==', req.params.screamId)
      .limit(1);
  
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);
  
    let screamData;
  
    screamDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          screamData = doc.data();
          screamData.screamId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Scream not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return db
            .collection('likes')
            .add({
              screamId: req.params.screamId,
              userHandle: req.user.handle
            })
            .then(() => {
              screamData.likeCount++;
              return screamDocument.update({ likeCount: screamData.likeCount });
            })
            .then(() => {
              return res.json(screamData);
            });
        } else {
          return res.status(400).json({ error: 'Scream already liked' });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
  };
  
//unlike scream

exports.unlikeScream=(req,res)=>{

    const likeDocument=db.collection('likes').where('userHandle','==',req.user.handle)
    .where('screamId','==',req.params.screamId).limit(1);

    const screamDocument=db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
    .then((doc)=>{
        if(doc.exists){
            screamData=doc.data()
            screamData.screamId=doc.id
            return likeDocument.get()
        }else{
            return res.status(500).json({error:'scream not found'})
        }
    })
    .then((data)=>{
        if(data.empty){
            return res.status(500).json({message:'post not liked'})    
        }
        else{
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(()=>{
                screamData.likeCount--
                return screamDocument.update({likeCount:screamData.likeCount})
            }).then(()=>{
                return res.json(screamData);
            })
        }
    }).catch(err=>{
        console.error(err)
        res.status(400).json({error:err.code})
    })
}

//delete Scream

exports.deleteScream=(req,res)=>{
    const document=db.doc(`/screams/${req.params.screamId}`)
    //res.json(req.user.handle)
    document.get()
    .then((doc)=>{
        if(!doc.exists){
            return res.status(400).json({error:'Scream not found'})
        }
        if(doc.data().userHandle!==req.user.handle){
            return res.status(400).json({error:'Unauthorized'})
        }
        else{
            return document.delete()
        }

    })
    .then(()=>{
        return res.json({message:'scream deleted successfully'})
    })
    .catch((err)=>{
        console.error(err)
        res.status(500).json({error:err.code})
    })
}