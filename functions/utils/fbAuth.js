const {admin,db} =require('./admin')
module.exports=(req,res,next)=>{
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken=req.headers.authorization.split('Bearer ')[1];
       // res.status(201).json({success:idToken})
    }
    else{
        console.error('Token not found');
        return res.status(403).json({error:'unathorized'})
    }
   // res.status(201).json({success:'hello'})
    admin.auth().verifyIdToken(idToken)
    .then(decodedToken=>{
        req.user=decodedToken
        //console.log(decodedToken)
        return db.collection('users')
        .where('userId','==',req.user.uid)
        .limit(1)
        .get()
    })
    .then(data=>{
        req.user.handle=data.docs[0].data().handle;
        req.user.imgUrl=data.docs[0].data().imgUrl;
        return next();
    })
    .catch(err=>{
        console.error('error while verifing token',err)
        return res.status(403).json({catch:err})
    })
}