import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { CardanoWallet,Factory, ProtocolParameters, protocolParametersQuery, TransactionParams } from 'cardano-wallet-tx'
import { useContext, useEffect, useState } from 'react'
import ConfigContext from '../utils/ConfigContext'
import { Transaction, TransactionWitnessSet } from '@emurgo/cardano-serialization-lib-browser'

const Home: NextPage = () => {
  const [cardanoWallet, setCardano] = useState<CardanoWallet>()
  const [config, _] = useContext(ConfigContext)
  const [pParams, setPParams] = useState<ProtocolParameters>()
  const CardanoSerializationLib = new Factory()
  const load = async () => {
    const pp = await protocolParametersQuery(config)
    console.log('loaded: ' + JSON.stringify(pp))
    if(pp && pp.data) setPParams(pp.data)
  }

  const pay = async () => {
    if(!cardanoWallet || !pParams) return
    if(!await cardanoWallet.enable('nami')) return
    const walletAddr = await cardanoWallet.getAddressHexString()
    if (!walletAddr || !cardanoWallet.wallet) return
    let utxos = await cardanoWallet.wallet.getUtxos();

    const txParams: TransactionParams = {
        ProtocolParameters: pParams,
        PaymentAddress: walletAddr,
        recipients: [
            {
                address: 'addr_test1qz8p9zjyk2us3jcq4a5cn0xf8c2ydrz2cxc5280j977yvc0gtg8vh0c9sp7ce579jhpmynlk758lxhvf52sfs9mrprwsjddese',
                amount: '2.5',
            }
        ],
        metadata: null,
        metadataHash: null,
        addMetadata: true,
        utxosRaw: utxos,
        ttl: null,
        multiSig: false,
        delegation: null,
        redeemers: [],
        plutusValidators: [],
        plutusPolicies: [],
        burn: false
    }

    let tx: Transaction | null = await cardanoWallet.transaction(txParams)
    if(!tx) return
    const transactionWitnessSet = TransactionWitnessSet.new();
    const txVkeyWitnessesStr = await cardanoWallet.wallet.signTx(Buffer.from(tx.to_bytes()).toString("hex"), false);
    const txVkeyWitnessesSer = TransactionWitnessSet.from_bytes(Buffer.from(txVkeyWitnessesStr, "hex"));
    if(!txVkeyWitnessesSer) return
    const witnessFromSignature = txVkeyWitnessesSer.vkeys()
    if(!witnessFromSignature) return
    transactionWitnessSet.set_vkeys(witnessFromSignature);
    const txBody = tx.body()
    let aux = tx.auxiliary_data();
    if(!aux) return
    txBody.set_auxiliary_data_hash(cardanoWallet.lib.hash_auxiliary_data(aux))
    const signedTx = Transaction.new(
        txBody,
        transactionWitnessSet,
        aux
    );

    const submittedTxHash = await cardanoWallet.wallet.submitTx(Buffer.from(signedTx.to_bytes()).toString("hex"));
    console.log({ submittedTxHash: submittedTxHash })
  }

  useEffect(() => {
    let isMounted = true
    load()
    CardanoSerializationLib.load().then((instance: CardanoWallet | undefined) => {
        isMounted && setCardano(instance)
        console.log('cardanoWallet')
        console.log(instance)
    })

    return () => {
        isMounted = false
    }
  }, [])

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>

        { cardanoWallet ? <button onClick={pay}>Click</button> : <button disabled>Click</button> }
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}

export default Home
