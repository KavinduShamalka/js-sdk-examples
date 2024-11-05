// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable no-console */
// import {
//     EthStateStorage,
//     CredentialRequest,
//     CircuitId,
//     ZeroKnowledgeProofRequest,
//     AuthorizationRequestMessage,
//     PROTOCOL_CONSTANTS,
//     AuthHandler,
//     core,
//     CredentialStatusType,
//     IdentityCreationOptions,
//     ProofType,
//     AuthorizationRequestMessageBody,
//     byteEncoder
//   } from '@0xpolygonid/js-sdk';
  
//   import {
//     initInMemoryDataStorageAndWallets,
//     initCircuitStorage,
//     initProofService,
//     initPackageManager,
//     initMongoDataStorageAndWallets
//   } from './walletSetup';
  
//   import { ethers } from 'ethers';
//   import dotenv from 'dotenv';
//   import express, { Request, Response } from 'express';
//   import { generateRequestData } from './request';
  
//   dotenv.config();
  
//   const app = express();
//   const port = process.env.PORT || 3000;
  
//   const rhsUrl = process.env.RHS_URL as string;
//   const walletKey = process.env.WALLET_KEY as string;
  
//   const defaultNetworkConnection = {
//     rpcUrl: process.env.RPC_URL as string,
//     contractAddress: process.env.CONTRACT_ADDRESS as string
//   };
  
//   export const defaultIdentityCreationOptions: IdentityCreationOptions = {
//     method: core.DidMethod.PolygonId,
//     blockchain: core.Blockchain.Polygon,
//     networkId: core.NetworkId.Amoy,
//     revocationOpts: {
//       type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
//       id: rhsUrl
//     }
//   };
  
//   // Function to create identity
//   async function identityCreation() {
//     console.log('=============== key creation ===============');
  
//     const { identityWallet } = await initInMemoryDataStorageAndWallets(defaultNetworkConnection);
//     const { did, credential } = await identityWallet.createIdentity({
//       ...defaultIdentityCreationOptions
//     });
  
//     console.log('=============== did ===============');
//     console.log(did.string());
//     console.log('=============== Auth BJJ credential ===============');
//     console.log(JSON.stringify(credential));
  
//     return { did: did.string(), credential };
//   }
  
//   // API route to call identityCreation function
//   app.get('/api/create-identity', async (req: Request, res: Response) => {
//     try {
//       const result = await identityCreation();
//       res.status(200).json({ success: true, data: result });
//     } catch (error) {
//       console.error('Error in identity creation:', error);
//       res.status(500).json({ success: false });
//     }
//   });
  
//   // Function to generate proofs
//   async function generateProofs(useMongoStore = false) {
//     console.log('=============== generate proofs ===============');
  
//     let dataStorage, credentialWallet, identityWallet;
//     if (useMongoStore) {
//       ({ dataStorage, credentialWallet, identityWallet } = await initMongoDataStorageAndWallets(
//         defaultNetworkConnection
//       ));
//     } else {
//       ({ dataStorage, credentialWallet, identityWallet } = await initInMemoryDataStorageAndWallets(
//         defaultNetworkConnection
//       ));
//     }
  
//     const circuitStorage = await initCircuitStorage();
//     const proofService = await initProofService(
//       identityWallet,
//       credentialWallet,
//       dataStorage.states,
//       circuitStorage
//     );
  
//     const { did: userDID, credential: authBJJCredentialUser } = await identityWallet.createIdentity({
//       ...defaultIdentityCreationOptions
//     });
  
//     console.log('=============== user did ===============');
//     console.log(userDID.string());
  
//     const { did: issuerDID, credential: issuerAuthBJJCredential } =
//       await identityWallet.createIdentity({ ...defaultIdentityCreationOptions });
  
//     const credentialRequest = createKYCAgeCredential(userDID);
//     const credential = await identityWallet.issueCredential(issuerDID, credentialRequest);
  
//     await dataStorage.credential.saveCredential(credential);
  
//     console.log('================= generate Iden3SparseMerkleTreeProof =======================');
  
//     const res = await identityWallet.addCredentialsToMerkleTree([credential], issuerDID);
  
//     console.log('================= push states to rhs ===================');
  
//     await identityWallet.publishRevocationInfoByCredentialStatusType(
//       issuerDID,
//       CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
//       { rhsUrl }
//     );
  
//     console.log('================= publish to blockchain ===================');
  
//     const ethSigner = new ethers.Wallet(walletKey, (dataStorage.states as EthStateStorage).provider);
//     const txId = await proofService.transitState(
//       issuerDID,
//       res.oldTreeState,
//       true,
//       dataStorage.states,
//       ethSigner
//     );
//     console.log(txId);
  
//     console.log('================= generate credentialAtomicSigV2 ===================');
  
//     const proofReqSig: ZeroKnowledgeProofRequest = createKYCAgeCredentialRequest(
//       CircuitId.AtomicQuerySigV2,
//       credentialRequest
//     );
  
//     const { proof, pub_signals } = await proofService.generateProof(proofReqSig, userDID);
  
//     const sigProofOk = await proofService.verifyProof(
//       { proof, pub_signals },
//       CircuitId.AtomicQuerySigV2
//     );
//     console.log('valid: ', sigProofOk);
  
//     console.log('================= generate credentialAtomicMTPV2 ===================');
  
//     const credsWithIden3MTPProof = await identityWallet.generateIden3SparseMerkleTreeProof(
//       issuerDID,
//       res.credentials,
//       txId
//     );
  
//     console.log(credsWithIden3MTPProof);
//     await credentialWallet.saveAll(credsWithIden3MTPProof);
  
//     const proofReqMtp: ZeroKnowledgeProofRequest = createKYCAgeCredentialRequest(
//       CircuitId.AtomicQueryMTPV2,
//       credentialRequest
//     );
  
//     const { proof: proofMTP, pub_signals: pub_signalsMTP } = await proofService.generateProof(
//       proofReqMtp,
//       userDID
//     );
  
//     console.log(JSON.stringify(proofMTP));
//     const mtpProofOk = await proofService.verifyProof(
//       { proof: proofMTP, pub_signals: pub_signalsMTP },
//       CircuitId.AtomicQueryMTPV2
//     );
//     console.log('valid: ', mtpProofOk);
  
//     const { proof: proof2, pub_signals: pub_signals2 } = await proofService.generateProof(
//       proofReqSig,
//       userDID
//     );
  
//     const sigProof2Ok = await proofService.verifyProof(
//       { proof: proof2, pub_signals: pub_signals2 },
//       CircuitId.AtomicQuerySigV2
//     );
//     console.log('valid: ', sigProof2Ok);
//   }
  
//   // API route to call generateProofs function
//   app.get('/api/generate-proofs', async (req: Request, res: Response) => {
//     const useMongoStore = req.query.useMongoStore === 'true'; // Determine if using MongoDB or in-memory storage
//     try {
//       await generateProofs(useMongoStore);
//       res.status(200).json({ success: true });
//     } catch (error) {
//       console.error('Error in generating proofs:', error);
//       res.status(500).json({ success: false, message: 'Failed to generate proofs', error: error.message });
//     }
//   });
  
//   // Start server
//   app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
//   });


//   function createKYCAgeCredential(did: core.DID) {
//     const credentialRequest: CredentialRequest = {
//       credentialSchema:
//         'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json/KYCAgeCredential-v3.json',
//       type: 'KYCAgeCredential',
//       credentialSubject: {
//         id: did.string(),
//         birthday: 19960424,
//         documentType: 99
//       },
//       expiration: 12345678888,
//       revocationOpts: {
//         type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
//         id: rhsUrl
//       }
//     };
//     return credentialRequest;
//   }

//   function createKYCAgeCredentialRequest(
//     circuitId: CircuitId,
//     credentialRequest: CredentialRequest
//   ): ZeroKnowledgeProofRequest {
//     const proofReqSig: ZeroKnowledgeProofRequest = {
//       id: 1,
//       circuitId: CircuitId.AtomicQuerySigV2,
//       optional: false,
//       query: {
//         allowedIssuers: ['*'],
//         type: credentialRequest.type,
//         context:
//           'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld',
//         credentialSubject: {
//           documentType: {
//             $eq: 99
//           }
//         }
//       }
//     };
  
//     const proofReqMtp: ZeroKnowledgeProofRequest = {
//       id: 1,
//       circuitId: CircuitId.AtomicQueryMTPV2,
//       optional: false,
//       query: {
//         allowedIssuers: ['*'],
//         type: credentialRequest.type,
//         context:
//           'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json-ld/kyc-v3.json-ld',
//         credentialSubject: {
//           birthday: {
//             $lt: 20020101
//           }
//         }
//       }
//     };
  
//     switch (circuitId) {
//       case CircuitId.AtomicQuerySigV2:
//         return proofReqSig;
//       case CircuitId.AtomicQueryMTPV2:
//         return proofReqMtp;
//       default:
//         return proofReqSig;
//     }
//   }