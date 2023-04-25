import {ethers} from 'ethers'

import crypto from 'crypto'
 
import {  getAppName,getEnvironmentName} from './app-helper';
  
import { AssertionResult } from '../interfaces/types';
import { isAssertionSuccess } from './assertion-helper'; 

import database from '../db/db'
 
   
    export function toChecksumAddress(publicAddress:string):string|undefined
    {
        try{ 
            return ethers.utils.getAddress(publicAddress)
        }catch(e){
            return undefined 
        }
    }


    export function generateServiceNameChallengePhrase(
        unixTime:number,
        serviceName:string,
        publicAddress: string
        ){
        
      
      let formattedPublicAddress = toChecksumAddress(publicAddress)


      const accessChallenge = `Signing in to ${serviceName} as ${formattedPublicAddress} at ${unixTime.toString()}`

      return accessChallenge
    }
    
    export async function  upsertNewChallengeForAccount(
        publicAddress:string, 
        serviceName: string, 
        challengeGenerator?: Function
         )  : Promise<AssertionResult<any>> {

     if(!publicAddress){
         return {success:false,error:"invalid address provided"}
     }

      const unixTime = Date.now() 
 
      let formattedPublicAddress:string|undefined  = toChecksumAddress(publicAddress)

      if(!formattedPublicAddress){
          return {success:false, error:"Invalid public address provided"}
      }
     
      let challenge;

      if(challengeGenerator){
        challenge = challengeGenerator( unixTime, serviceName, formattedPublicAddress )
      }else{
        challenge = generateServiceNameChallengePhrase(  unixTime, serviceName, formattedPublicAddress)
      }

      
       

      //poor mans upsert 
      //i should do this a better way since challenge is unique and pub address is not .. yikes 
      const unixTimeNow = new Date().getTime()

 

      const existing = await database.challengeToken.findByOptional({
        
          publicAddress: formattedPublicAddress 
        
      }) 
       

      if( existing ){

        
        await database.challengeToken.where({
          id: existing.id
        }).update( {
            challenge: challenge,
             
        })


      }else{

        await database.challengeToken.create({ 
          
            challenge: challenge,
            publicAddress: formattedPublicAddress,
           
        })


      }
 
      
      return {success:true, data: challenge} 
    }



    export async function findActiveChallengeForAccount(publicAddress: string) : Promise<AssertionResult<{challenge?:any}>> {
      const ONE_DAY = 86400 * 1000

      let formattedPublicAddress = toChecksumAddress(publicAddress)

      if(!formattedPublicAddress){
        return {success:false, error:"Invalid public address provided"}
    }
  
      const existingChallengeToken = await database.challengeToken.findByOptional({
        
          publicAddress: formattedPublicAddress ,
          createdAt: { gt:  new Date(Date.now() - ONE_DAY) }
        
      })

      if(!existingChallengeToken){
        return {success:false, error:"Could not find active challenge"}
      }

      if(new Date(existingChallengeToken.createdAt) < new Date(Date.now() - ONE_DAY)){
        return {success:false, error:"Challenge has expired"}
      }
  
      return {success:true, data: existingChallengeToken }
    }

    export function generateNewAuthenticationToken() : string {
      return crypto.randomBytes(16).toString('hex')
    }

    export async function findActiveAuthSessionForAccount( publicAddress: string) : Promise<AssertionResult<any>> {
      const ONE_DAY = 86400 * 1000
  
      let formattedPublicAddress = toChecksumAddress(publicAddress)


      if(!formattedPublicAddress) return {success:false, error:'provided invalid public address'}
  
      const existingSession = await database.userSession.findByOptional({
        
          publicAddress: formattedPublicAddress,
          createdAt: { gt:  new Date(Date.now() - ONE_DAY) }
         
      })

      if(!existingSession){
        return {success:false, error:"Could not find auth token"}
      }


      if(new Date(existingSession.createdAt ) < new Date(Date.now() - ONE_DAY)){
        return {success:false, error:"Auth token has expired"}
      }
  
      return {success:true, data: existingSession}
    }

 


    /*
      Checks for either an auth token or an api key for the account.
    */

    export async function validateAuthToken(
      {
      publicAddress,
      authToken
      }:{
      publicAddress: string,
      authToken: string
     }
    )  : Promise<AssertionResult<any>>  {
      //always validate if in dev mode
      if (getEnvironmentName() == 'test') {
        return {success:true, data:undefined }
      }
  
      //const ONE_DAY = 86400 * 1000
  
      let formattedPublicAddress = toChecksumAddress(publicAddress)
      if(!formattedPublicAddress) return {success:false, error:'provided invalid public address'}
  
      const existingAuthToken = await database.userSession
      .findByOptional(
        {
          publicAddress: formattedPublicAddress,
          sessionToken: authToken, 
          expiresAt: { gt: new Date() }    //look for: expiration date is in the future
        //  createdAt: { gt:  new Date( expiresAt ) }
        }
      )


      if(existingAuthToken){

        return {success:true, data:existingAuthToken} 

      }else{

       
        const existingApiKey = await database.apiKey.findByOptional(
          {            
            publicAddress: formattedPublicAddress,
            key: authToken,
          }
        )

        if(existingApiKey){

          return {success:true, data:existingApiKey} 
        
        }else{
          return {success:false, error:'no active authentication token found'}

        }
        
      }
      
    //  return {success:false, error:existingAuthToken} 
    }
     


    export function validatePersonalSignature(
      fromAddress: string,
      signature: string,
      challenge: string,
      signedAt?: number
    ) : AssertionResult<any> {

      if(!signedAt) signedAt = Date.now()
      //let challenge = 'Signing for Etherpunks at '.concat(signedAt)
  
      let recoveredAddress = ethersEcRecover(challenge, signature)
  
      if (!recoveredAddress) { 
        return {success:false, error:"unable to recover personal signature"}
      }
  
      let formattedRecoveredAddress = toChecksumAddress(recoveredAddress)
  
      if (formattedRecoveredAddress != toChecksumAddress(fromAddress)) {
        
        return {success:false, error:"unable to recover personal signature"}
      }
  
      const ONE_DAY = 1000 * 60 * 60 * 24
  
      if (signedAt < Date.now() - ONE_DAY) {
        return {success:false, error:"personal signature expired"}
      }
  
      return {success:true, data:undefined}
    }
  
    


  export function ethersEcRecover(msg: string, signature: string): string | null {
    try {
      const res = ethers.utils.splitSignature(signature);

      const msgHash = ethers.utils.hashMessage(msg);

      const recoveredSignatureSigner = ethers.utils.recoverAddress(msgHash, res);
      console.log("rec:", recoveredSignatureSigner);

      return recoveredSignatureSigner;
    } catch (e) {
      console.error(e);
    }

    return null;
  }

    





    export async function createNewAuthenticatedUserSession(
      publicAddress:string  
    ) : Promise<AssertionResult<any>> {
        
        

        let matchingUser;
        let matchingUserResponse = await database.user.findByOptional(
           {publicAddress}
        )

        if(!matchingUserResponse ){
            //create a new udser 

            let createdUserResponse = await insertNewUser( { publicAddress } )
            if(!isAssertionSuccess(createdUserResponse)) return createdUserResponse

            let createdUser =  createdUserResponse.data

            matchingUser = createdUser
        }else{
            matchingUser = matchingUserResponse
        }

      
        //look for a user that already exists with the email address 


        
        if(!matchingUser){
            return {success:false, error:"Unable to find or create user for auth flow"}
        }
        
        console.log({matchingUser})

        let sessionCreationResponse = await insertUserSession(matchingUser)

        if(!isAssertionSuccess(sessionCreationResponse)) return sessionCreationResponse 
        let sessionCreated = sessionCreationResponse.data

        //@ts-ignore  
        return  {success: true,  data: {authToken: sessionCreated.sessionToken , expiresAt: sessionCreated.expiresAt   }  }
      
    }



    export async function  insertNewUser( {publicAddress}:{publicAddress:string }) : Promise<AssertionResult<any>> { 
          

        let newRecordResponse = await database.user.create( {
             
             publicAddress 
            
             })

        if(!newRecordResponse){
            return {success:false, error:'Could not create user record'}
        }

        return {success:true, data: newRecordResponse}
    }

    export async function  insertUserSession(user:any): Promise<AssertionResult<any>> {

        let sessionToken = generateNewRandomBytes()

        if(!user || !user.id){
          return {success:false, error:'Could not create session for undefined user'}
        }

        let publicAddress =  user.publicAddress   

        let expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2); // 2 days from now
 

        let newRecordResponse = await database.userSession.create( {
             publicAddress,
             sessionToken,
             expiresAt
          })

        if(!newRecordResponse){
            return newRecordResponse
        }

        return {success:true, data: { sessionToken, expiresAt }}
    }
 

    export function generateNewRandomBytes(){
      return crypto.randomBytes(24).toString('hex');
    }