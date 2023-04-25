


import { ethers } from "ethers";
import { isArray, parseInt } from 'lodash';
 

import {createContext} from 'react'

import {getEnvironmentName} from '@/lib/app-helper'
 
 

import axios from 'axios'
import { makeObservable, observable, action, computed } from "mobx"

 const ENV_MODE = getEnvironmentName()
 import serverConfig from  '@/config/server-config.json' 

 const localServerConfig = serverConfig[ENV_MODE]
export class Web3Store {
    
    provider = undefined
    signer = undefined 
    account=undefined
    
  //  balance=0
    chainId=undefined 

    transactionCount = undefined 


    challenge=undefined
    authToken=undefined
    authTokenExpiresAt =undefined

 
    customCallbacks = {} 
 
  
    constructor() {
 
      
        makeObservable(this, {
            provider: observable,
            signer: observable,
            account: observable,
       
         
        //    balance: observable,
            challenge: observable,
            authToken: observable,
            authTokenExpiresAt: observable,
     //       authorized: observable, 

            active: computed,
            authorized:computed, 
            loadState : action , 
            connect: action,
            disconnect: action,
            registerWalletCallbacks: action ,

            requestChallengeAndSign: action,
          
            registerCustomCallback : action 
        })
        
    }
    get active() {
      return this.account !== undefined
    }


    get authorized() {
 
      let isAuthed =(
         this.authToken !== undefined &&
          this.authTokenExpiresAt !== undefined &&
          new Date(this.authTokenExpiresAt) > Date.now())
      
      console.log({isAuthed} , this.authTokenExpiresAt , new Date(this.authTokenExpiresAt) > Date.now())
     
      return isAuthed
    }
 
     
    async connect() {

      this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
          // Prompt user for account connections
      await this.provider.send("eth_requestAccounts", []);
      this.signer = this.provider.getSigner();
      console.log("Account:", await this.signer.getAddress());
      let account = await this.signer.getAddress()

    //  let balance = await this.signer.getBalance()
      //let balanceFormatted = ethers.utils.formatEther(balance)

      const { chainId } = await this.provider.getNetwork()

  

      this.account = account 
     // this.balance = balance 
     // this.active = true 
      this.chainId = chainId 
      
      this.registerWalletCallbacks()

      this.saveState()

    }

    async disconnect() {

      this.account = undefined
    //  this.active = false 
      this.balance = 0


      this.authToken = undefined
     
      
      this.saveState()

    }


    //these dont work properly like this w strict mode ...
    registerWalletCallbacks(){

      window.ethereum.on('connect', ({chainId}) => {
        this.chainId = chainId
        this.emitCustomEvent('connect')
      });

      window.ethereum.on('chainChanged', (chainId) => {
        this.chainId = chainId
        this.emitCustomEvent('chainChanged')
        console.log('chain changed')
      });

      window.ethereum.on('accountsChanged', async (accounts) => {
        this.account = accounts[0]
        this.emitCustomEvent('accountsChanged')
        console.log('account changed')
       
      });

    }

    emitCustomEvent(name){

      
      if(isArray(this.customCallbacks[name])){
       for(let cb of this.customCallbacks[name]){ 

            cb() 

       }
      }

    }

    /*
      Allows for registering callbacks to trigger
      when certain wallet callbacks trigger such as accountsChanged
    */
    registerCustomCallback( name, callback   ){

      if(!isArray(this.customCallbacks[name])){
        this.customCallbacks[name] = [] 
      }

      this.customCallbacks[name].push( callback )

      console.log('registered callback ', name )

    }



    async requestChallengeAndSign(){

      //request the challenge from the server 
      // pop up metamask to personal sign it 
      // submit that signature to the server 

      const backendServerUrl = localServerConfig.backendServerUrl

      console.log(`${backendServerUrl}/generateChallenge`)

      let challengePostRequest = await axios.post(`${backendServerUrl}/generateChallenge`,{ publicAddress: this.account })

      let challengeResponse = challengePostRequest.data

      if(challengeResponse.success){
 
        let challenge = challengeResponse.data.challenge

        this.challenge = challenge

        const publicAddress = this.account

  
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

        let signature = await provider.getSigner(publicAddress).signMessage(challenge)
 
        
        let authorizationPostRequest = await axios.post(`${backendServerUrl}/generateUserSession`,{ publicAddress: this.account, signature: signature, challenge: challenge  })

        let authorizationResponse = authorizationPostRequest.data 

        console.log({authorizationResponse})

        let {authToken,expiresAt} = authorizationResponse.data
 

        this.authToken = authToken
        this.authTokenExpiresAt = expiresAt 
       // this.authorized = true 

        console.log('set auth token', this.authToken,  this.authTokenExpiresAt)

        this.saveState()

        return true 
      }else{
        console.error(challengeResponse.error)
      }

      return false 
 


    }




    saveState( ) {
      const state = {
        // Include the properties you want to save in localStorage
        authToken:this.authToken,
        authTokenExpiresAt:this.authTokenExpiresAt,
         account: this.account
      };
      localStorage.setItem("w3Store", JSON.stringify(state));
    }
    
    // Load state from localStorage
    loadState() {
      const storedState = localStorage.getItem("w3Store");
      if (storedState) {
        const state = JSON.parse(storedState);
        // Update the store properties with the loaded state
    
        this.account = state.account 
        this.authToken = state.authToken 
        this.authTokenExpiresAt = state.authTokenExpiresAt
 
      }
    }
    

 

}




export async function requestAddNetwork({chainId,chainName,rpcUrl}){
  console.log('request add network')

  const params = [{
    chainId,
    chainName, 
    rpcUrls:[rpcUrl] ,
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH", 
      decimals: 18,
    },
  }]

  console.log({params})
  let addedNetwork = await window.ethereum.request({
    id: 1,
    jsonrpc: "2.0", 
    method: 'wallet_addEthereumChain',
    params 
  })


  console.log({addedNetwork})
}
 

export function getNetworkNameFromChainId(chainId){

  switch(chainId){
    case 1: return 'mainnet'
    case 4: return 'rinkeby'
    case 5: return 'goerli'
    //case 17001: return 'mainnet'
    //case 17005: return 'goerli'

    default: return 'unknown'
  }

}



const web3Store = new Web3Store();

export const Web3StoreContext = createContext(web3Store);
