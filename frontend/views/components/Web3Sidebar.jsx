import React,{ useState , useRef, useEffect} from 'react';
 
 
import Blockie from "@/views/components/Blockie.jsx"
import FadingAlert from "@/views/components/fading-alert.jsx"
 
import {observer} from "mobx-react"

import {getNetworkNameFromChainId} from '@/stores/web3-store-mobx.js'
import { copyToClipboard } from '../../../utils/clipboard';



//disabled for now as there is no associated backend server to provide challenges
const showSigninButton = true 



function Web3Sidebar({slot,web3Store,sidebarStore })   {
 
    

  let connectWeb3 = async function() {

   console.log('connect web3')

   await web3Store.connect() 

  }


  let disconnectWeb3 = async function() {

    console.log('disconnect web3')

     
    await web3Store.disconnect()

  }

  let copyAccountToClipboard = async function() {

    let copied = await copyToClipboard(web3Store.account)


    //show the fading alert 
    sidebarStore.triggerAddressCopiedAlert() 
    

  }

  let setSidebarOpen = function(open){
 
    sidebarStore.setOpen(open)
  }

  
 

  // on mount 
  useEffect(  ()=>{
  
    web3Store.loadState();
  }, []) // <-- empty dependency array





  return ( 
   <>
    { sidebarStore.open &&   (
 
  <div
  
  className=" animate__animated animate__slideInRight fixed right-0 top-0 p-6 h-full bg-neutral-800 flex flex-col"

  style={{zIndex:"60"}}
  >


    <div className="flex flex-row">

    { web3Store.active && 
    <div 
        className=" block  text-sm text-right flex-grow whitespace-nowrap"
         > 
         <div
           className="p-1 m-1 inline-block bg-neutral-600 text-beta-500 rounded rainbow-underline cursor-pointer "
           >
         <span className="inline-block"> ♦ { getNetworkNameFromChainId(web3Store.chainId) }  </span>
         </div>
      </div>
    }

         <div 
      className="w-full text-white flex justify-end cursor-pointer mb-16"
      onClick={()=> setSidebarOpen(false)}
      > 
       <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg> 
      </div>
    </div>
   


    <div className="flex-grow">

      
    { web3Store.active && 
    <div className="w-full text-white" style={{minWidth:"240px"}}> 


      <div className="block w-full text-center my-4">
         <Blockie 
         className=" "
         web3Store={web3Store}
                
         />
    </div> 

        <div 
        className="  block text-md mt-4 flex flex-row cursor-pointer hover:bg-neutral-600 relative"
         style={{maxWidth:"200px"}}
         onClick={() => copyAccountToClipboard()}
         > 

          {sidebarStore.addressCopiedAlertEnabled && 
          <FadingAlert 
            content={"Copied"}
            
          />
          }

          <div className=" truncate text-ellipsis flex-grow "
          >{web3Store.account}</div> 
          
           <div className=""> 📋 </div> 
           
         </div>

    
       
       
     </div>
}

        <div>
            { !web3Store.active && 
            <div 
              className="w-full text-white my-8 p-2 bg-neutral-600 hover:bg-neutral-700 cursor-pointer "
              style={{minWidth:"240px"}}
              onClick={() => connectWeb3()}
              > 
              Connect
              </div>
          }



            {web3Store.active && !web3Store.authorized && showSigninButton &&
                <div 
              
                className="w-full text-white my-8 p-2 bg-neutral-600 hover:bg-neutral-700 cursor-pointer"
                  onClick={async ()=>{ 

                    let signSuccess = await web3Store.requestChallengeAndSign( )

                    console.log('request challenge')


                    if(signSuccess){
                      sidebarStore.setOpen(false)
                    }

                  }}
                  
                  >                     
                  Sign In
                  </div> 
                }

      </div>

      
      {(web3Store.active &&  slot) && 
        <div className="mt-4">
          {slot}
        </div>
        }



      </div>



      { web3Store.active && 
          <div 
            className="w-full text-white my-8 p-2 bg-neutral-600 hover:bg-neutral-700 cursor-pointer "
            onClick={() => disconnectWeb3()}
            > 
            Disconnect
            </div>
      }



      </div>
      


    
    )}  </>
              
      
      
  );
}

export default observer(Web3Sidebar);

 