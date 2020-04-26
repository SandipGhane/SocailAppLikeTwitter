
const isEmpty=(string)=>{
    if(string.trim()==='')
    {
        return true
    }else {return false}
}

const isEmail=(email)=>{
    var regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)){
        return true
    }else{
        return false
    }
}


exports.reduceUserDetails=(data)=>{

    let userDetails={}
    if(!isEmpty(data.Bio.trim())){
        userDetails.Bio=data.Bio
    }
    
   // if(!isEmpty(data.bio.trim())) 
    if(!isEmpty(data.webside)){
        if(data.webside.trim().substring(0,4)!=='http')
        {
            userDetails.webside=`http://${data.webside}`
        }
        else{
            userDetails.webside=data.webside
        }
    }

    if(!isEmpty(data.location.trim()))
    {
        userDetails.location=data.location
    }

  
    return userDetails
}

exports.validateSignupData=(data)=>{
    let errors={};
    if(isEmpty(data.email)){
        errors.email='Email must not be empty'
    }
    if(!isEmail(data.email)){
        errors.email='Must be a valid Email address'
    }
    
    
    if(isEmpty(data.password)){
        errors.password='Password must not be empty'
    }
    if(data.password!==data.confirmPassword){
        errors.confirmpassword='password and confirm password not match'
    }
    if(isEmpty(data.handle)){
        errors.handle='Handle must not empty'
    }

    return {
        errors,
        valid:Object.keys(errors).length===0?true:false
    }

}

exports.validateLoginData=(data)=>{
    let errors={}
    if(isEmpty(data.email)){
        errors.email="Email must not be Empty"
    }
    if(isEmpty(data.password)){
        errors.password="Password must not be empty"
    }
    return {errors,valid:Object.keys(errors).length===0?true:false}
}
