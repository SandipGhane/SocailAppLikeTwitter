const {db,admin}=require('../utils/admin')
const config=require('../utils/config')
const {validateSignupData,validateLoginData,reduceUserDetails}=require('../utils/validators')

const firebase=require('firebase')  
firebase.initializeApp(config)


//signup routers
 
exports.signup=(req,res)=>{
    const newUser={
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,
    };

    const {valid,errors}=validateSignupData(newUser);

    if(!valid){
        return res.status(400).json(errors)
    }
    let defImg='no-img.jpg'
    //const path=newUser.handle;
    let token,userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc=>{
        if(doc.exists)
        {
            return res.status(400).json({handle:'user already exixts'});
        }
        else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password)
        }
    }).then((data)=>{
        userId=data.user.uid;
        //console.log(userId)    
        return data.user.getIdToken()
    })
    .then((idToken)=>{
        token=idToken;
       // console.log("toke"+token)
        const userCredentials={
            handle:newUser.handle,
            email:newUser.email,
            createdAt:new Date().toISOString(),
            imgUrl:`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${defImg}?alt=media`,
            userId
        };
        //let userValid=userCredentials.handle;
       return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    }).then((data)=>{
        return res.status(201).json({token});
    })
    .catch(err=>{
        //console.error(err);
        if(err.code==='auth/email-already-in-use')
        {
            return res.status(400).json({error:'email is already registered'});
        }
        else{
            return res.status(500).json({general:'Something went wrong,Please try again'})
        }
        
    })

 }


 //login Routes

 exports.login=(req,res)=>{
    const user={
        email:req.body.email,
        password:req.body.password
    }

    const {valid,errors}=validateLoginData(user);
    if(!valid){
        return res.status(400).json(errors)
    }
    else{
        firebase.auth().signInWithEmailAndPassword(user.email,user.password)
        .then((data)=>{
            return data.user.getIdToken()
        })
        .then((token)=>{
            return res.status(200).json({token})
        })
        .catch((err)=>{
            console.error(err)
            return res.status(403).json({general:"Wrong credentials,Please try again"})
          
        })
    }
 }


//Add User Details
exports.addUserDetails=(req,res)=>{
    
    let userDetails=reduceUserDetails(req.body)

    db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(()=>{
        return res.json({message:'details added successfully'})
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({err})
    })
}



//get own user details
exports.getAuthenticatedUser=(req,res)=>{
    let userData={}
    db.doc(`/users/${req.user.handle}`).get()
    .then((doc)=>{
        if(doc.exists)
            userData.credentials=doc.data()
              //console.log('jello')
            return db.collection('likes').where('userHandle','==',req.user.handle).get()

    }).then((data)=>{
        userData.likes=[];
        data.forEach((doc)=>{
            userData.likes.push(doc.data())
        });
        //return res.json(req.user.handle)

        return db.collection('notifications').where('recipient','==',req.user.handle)
        .orderBy('createdAt','desc').get()

    }).then((data)=>{
        //res.json(data());
        userData.notifications=[]
        data.forEach(doc=>{
            userData.notifications.push({
                recipient:doc.data().recipient,
                sender:doc.data().sender,
                createdAt:doc.data().createdAt,
                screamid:doc.data().screamid,
                type:doc.data().type,
                read:doc.data().read,
                notificationId:doc.id
            })

        })
        return res.json(userData)
    })
    .catch(err=>{
        console.error(err)
        return res.status(500).json({error:err.code})
    })
}

//get user Details

exports.getUserDetails=(req,res)=>{
    let userData={}
    db.doc(`/users/${req.params.handle}`).get()
        .then(doc=>{
            if(doc.exists){
                userData.user=doc.data()
                return db.collection('screams').where('userHandle','==',req.params.handle)
                    .orderBy('createdAt','desc')
                    .get()
            }else{
            return res.status(400).json({error:'user not found'})
            }
        })
        .then(data=>{
            userData.screams=[]
            //res.json(userData)
            data.forEach(doc=>{
                userData.screams.push({
                    body:doc.data().body,
                    createdAt:doc.data().createdAt,
                    userHandle:doc.data().userHandle,
                    userImage:doc.data().userImage,
                    likeCount:doc.data().likeCount,
                    commentCount:doc.data().commentCount,
                    screamid:doc.id

                })
            })
            return res.json(userData)
        })
        .catch(err=>{
            console.error(err)
            return res.status(400).json({error:err.code})
        })
}


//Upload Image
 exports.uploadImage=(req,res)=>{
    const BusBoy=require('busboy')
    const fs=require('fs')
    const path=require('path')
    const os=require('os')

    let imageFileName
    let imageToBeUploaded
    const busboy=new BusBoy({headers:req.headers})
    //console.log('hello')
    busboy.on('file',(fieldname,file,filename,encoding,minetype)=>{

        if(minetype!=='image/png' && minetype!=='image/jpeg'){
            return res.status(400).json({filerror:'file not supported,Please choose valid file format'})
        }
        /*console.log(fieldname)
        console.log(file)
        console.log(filename)
        console.log(minetype)
        */
        const imageExtension=filename.split('.')[filename.split('.').length-1]
        imageFileName=`${Math.round(Math.random()*10000)}.${imageExtension}`
       //console.log(imageFileName);
        const filepath=path.join(os.tmpdir(),imageFileName)
        imageToBeUploaded={filepath,minetype}
        file.pipe(fs.createWriteStream(filepath))
    })
    busboy.on('finish',()=>{
        console.log('enter');
        admin.storage().bucket().upload(imageToBeUploaded.filepath,{
            resumable:false,
            metadata:{
                metadat:{
                    contentType:imageToBeUploaded.minetype
                }
            }
        }).then(()=>{
            const imageUrl=`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
            console.log(`image name:::${imageFileName}`)
            return db.doc(`/users/${req.user.handle}`).update({imgUrl:imageUrl})
        }).then(()=>{
            return res.json({message:'image upload successfully'})
        }).catch(err=>{
            console.error(err)
            return res.status(500).json({error:err.code})
        })
    })
    busboy.end(req.rawBody)
 }


 exports.markNotificationsRead=(req,res)=>{
     let batch=db.batch()
     req.body.forEach(notificationId=>{
         const notification=db.doc(`/notifications/${notificationId}`);
         batch.update(notification,{read:true})
     })
     batch.commit()
     .then(()=>{
         return res.json({message:'notifications marks as read'})
     })
     .catch(err=>{
         console.error(err)
         return res.status(400).json(err.code)
     })
 }

 exports.signUpGoogle=(req,res)=>{
     base_provider = new firebase.auth.GithubAuthProvider()
     firebase.auth().signInWithPopup(base_provider)
        .then((res)=>{
            return res;
        }).catch(err=>console.log(err))
    
 }

