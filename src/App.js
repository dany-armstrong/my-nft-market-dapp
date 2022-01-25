import React, { useEffect, useContext } from "react";
import { BrowserRouter } from "react-router-dom";
import logo from "./logo.svg";
import "./App.css";
import AppLayout from "./layout/AppLayout";

import web3 from "./web3/connection/web3";
import Web3Context from "./web3/store/web3-context";
import CollectionContext from "./web3/store/collection-context";
import MarketplaceContext from "./web3/store/marketplace-context";
import NFTCollection from "./contract-abis/localhost/MyNftCollection.json";
import NFTMarketplace from "./contract-abis/localhost/MyNftMarketplace.json";

function App() {
  const web3Ctx = useContext(Web3Context);
  const collectionCtx = useContext(CollectionContext);
  const marketplaceCtx = useContext(MarketplaceContext);

  useEffect(() => {
    if (!web3) {
      window.alert(
        "Non-Ethereum browser detected. You should consider trying MetaMask!"
      );
      return;
    }

    const initWeb3 = async () => {
      try {
        await window.ethereum.request({
          method: "eth_requestAccounts",
        });
      } catch (error) {
        console.error(error);
      }

      const account = await web3Ctx.loadAccount(web3);
      // const networkId = await web3Ctx.loadNetworkId(web3);

      // const nftDeployedNetwork = NFTCollection.networks[networkId];
      const nftContract = collectionCtx.loadContract(
        web3,
        NFTCollection
        // nftDeployedNetwork
      );

      // const mktDeployedNetwork = NFTMarketplace.networks[networkId];
      const mktContract = marketplaceCtx.loadContract(
        web3,
        NFTMarketplace
        // mktDeployedNetwork
      );

      if (nftContract) {
        const totalSupply = await collectionCtx.loadTotalSupply(nftContract);

        collectionCtx.loadCollection(nftContract, totalSupply);

        nftContract.events
          .Transfer()
          .on("data", (event) => {
            collectionCtx.updateCollection(
              nftContract,
              event.returnValues.tokenId,
              event.returnValues.to
            );
            collectionCtx.setNftIsLoading(false);
          })
          .on("error", (error) => {
            console.log(error);
          });
      } else {
        window.alert(
          "NFTCollection contract not deployed to detected network."
        );
      }

      if (mktContract) {
        const offerCount = await marketplaceCtx.loadOfferCount(mktContract);

        marketplaceCtx.loadOffers(mktContract, offerCount);

        account && marketplaceCtx.loadUserFunds(mktContract, account);

        mktContract.events
          .OfferFilled()
          .on("data", (event) => {
            marketplaceCtx.updateOffer(event.returnValues.offerId);
            collectionCtx.updateOwner(
              event.returnValues.id,
              event.returnValues.newOwner
            );
            marketplaceCtx.setMktIsLoading(false);
          })
          .on("error", (error) => {
            console.log(error);
          });

        mktContract.events
          .Offer()
          .on("data", (event) => {
            marketplaceCtx.addOffer(event.returnValues);
            marketplaceCtx.setMktIsLoading(false);
          })
          .on("error", (error) => {
            console.log(error);
          });

        mktContract.events
          .OfferCancelled()
          .on("data", (event) => {
            marketplaceCtx.updateOffer(event.returnValues.offerId);
            collectionCtx.updateOwner(
              event.returnValues.id,
              event.returnValues.owner
            );
            marketplaceCtx.setMktIsLoading(false);
          })
          .on("error", (error) => {
            console.log(error);
          });
      } else {
        window.alert(
          "NFTMarketplace contract not deployed to detected network."
        );
      }

      collectionCtx.setNftIsLoading(false);
      marketplaceCtx.setMktIsLoading(false);

      window.ethereum.on("accountsChanged", (accounts) => {
        web3Ctx.loadAccount(web3);
        accounts[0] && marketplaceCtx.loadUserFunds(mktContract, accounts[0]);
      });

      window.ethereum.on("chainChanged", (chainId) => {
        window.location.reload();
      });
    };

    initWeb3();
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <AppLayout />
      </div>
    </BrowserRouter>
  );
}

export default App;
