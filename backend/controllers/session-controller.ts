import { ControllerMethod } from "degen-route-loader"
import { createNewAuthenticatedUserSession,  upsertNewChallengeForAccount, validatePersonalSignature } from "../lib/session-lib"
import { sanitizeAndValidateInputs,  ValidationType } from "../lib/sanitize-lib"
 
import { isAssertionSuccess } from "../lib/assertion-helper"
import { getAppName } from "../lib/app-helper"
import GenericController from "./generic-controller"
 
 
const SERVICE_NAME = getAppName()



export default class SessionController extends GenericController {
 



    getControllerName() : string {
        return 'session'
    }
   

    generateChallenge: ControllerMethod = async (req: any) => {
       
        const sanitizeResponse = sanitizeAndValidateInputs(req.fields , [
          
            { key: 'publicAddress', type: ValidationType.publicaddress, required: true },
             
          ])


        if(!isAssertionSuccess(sanitizeResponse)) return sanitizeResponse

        const {publicAddress} = sanitizeResponse.data 

      
        
        //make sure public address is a valid address 
  
        let upsertedChallengeResponse  = await upsertNewChallengeForAccount( 
            publicAddress, 
            SERVICE_NAME
             )

        if(!isAssertionSuccess(upsertedChallengeResponse)) return upsertedChallengeResponse
        let upsertedChallenge = upsertedChallengeResponse.data

        console.log('upsertedChallenge',upsertedChallenge)

        return   {success:true, data:{ publicAddress:publicAddress, challenge: upsertedChallenge} }
    }

    
    //generates an Auth Token by verifying signature w challenge
    generateUserSession: ControllerMethod = async (req: any) => {

       
        const sanitizeResponse = sanitizeAndValidateInputs(req.fields , [
          
            { key: 'publicAddress', type: ValidationType.publicaddress, required: true },
            { key: 'challenge', type: ValidationType.string, required: true }, 
            { key: 'signature', type: ValidationType.string, required: true }, 
          ])

        if(!isAssertionSuccess(sanitizeResponse)) return sanitizeResponse

        const {publicAddress, challenge, signature} = sanitizeResponse.data 

        /*
        if(!challenge){
            let challengeRecordResponse = await findActiveChallengeForAccount(publicAddress)
              
            if(isAssertionSuccess(challengeRecordResponse)){
                const challengeRecord = challengeRecordResponse.data
                 challenge = challengeRecord.challenge
            }
          }
    
          if(!challenge){
            return {success:false, error:'no active challenge found for user'} 
          }

        */

        //validate signature
          //should read the date out of the challenge !! otherwise expiration is useless and the same challenge can be replayed 
        let signatureValid =  validatePersonalSignature(publicAddress,signature,challenge)

        if(!signatureValid){
            return {success:false, error:"signature invalid"}
        }
 
  
        let newSessionResponse  = await  createNewAuthenticatedUserSession( publicAddress  )

        if(!isAssertionSuccess(newSessionResponse)) return newSessionResponse

        let {authToken,expiresAt} = newSessionResponse.data
 

        return  {success:true, data: {publicAddress, authToken, expiresAt} }
    }

   

}