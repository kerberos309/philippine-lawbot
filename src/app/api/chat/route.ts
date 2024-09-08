import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import {RetrievalQAChain} from "langchain/chains"
import { NextRequest, NextResponse } from 'next/server';

const pineconeApiKey = process.env.PINECONE_API_KEY as string;
if(pineconeApiKey === undefined){
    throw "UNABLE TO RETRIEVE PINECONE API KEY!";
}


export async function POST (req: NextRequest) {
    try {
        const {question} = await req.json();
        console.log(question);
        const namespace = process.env.PINECONE_NAMESPACE as string;
        const pineconeClient = new Pinecone({apiKey: pineconeApiKey});
        const openAIEmbeddings = new OpenAIEmbeddings();
        const pineconeIndex = pineconeClient.Index(process.env.PINECONE_INDEX as string).namespace(namespace);
        const pineconeStore = await PineconeStore.fromExistingIndex(openAIEmbeddings, { pineconeIndex });
        const retriever = pineconeStore.asRetriever({searchKwargs:{fetchK:1},filter:{namespace: namespace}});
        const openAI = new OpenAI({apiKey:process.env.OPENAI_API_KEY});

        const translator = await openAI.chat.completions.create({
            model:"gpt-3.5-turbo-0125",
            messages:[
                {
                    "role":"system",
                    "content":`You are an AI language model assistant.\n
                    Your task is to generate five different questions of the given user question to retrieve relevant documents from a vector database.\n 
                    By generating multiple perspectives on the user question, your goal is to help the user overcome some of the limitations of the distance-based similarity search. \n
                    Provide these alternative questions separated by new lines.`
                },
                {
                    "role":"user",
                    "content":question
                }
            ]
        });
        const translatorResponse = translator.choices[0]["message"].content?.split('\n');
        let similarityTranslatorDictionary: Record<number, string> = {};
        for (const item of translatorResponse ?? []){
            // console.log(item);
            const similaritySearchTranslator = await pineconeStore.similaritySearchWithScore(item, 1,{
                namespace:namespace
            });
            similarityTranslatorDictionary[similaritySearchTranslator[0][1]] = item
        }
        const translatorHighestScoreQuestion = Object.keys(similarityTranslatorDictionary).map(Number).sort((a,b)=>b-a)[0];
        const decomposition = await openAI.chat.completions.create({
            model:"gpt-3.5-turbo-0125",
            messages:[
                {
                    "role":"system",
                    "content":`You are an AI language model assistant.\n 
                    Your task is to generate multiple sub-questions related to an input context.\n
                    The goal is to break down the context into a set of sub-problems/sub-questions that can be answerd in isolation.\n
                    Generate multiple search queries related to: {question}\n
                    Output (3 queries):`
                },
                {
                    "role":"user",
                    "content":similarityTranslatorDictionary[translatorHighestScoreQuestion]
                }
            ]
        });
        const decompositionResponse = decomposition.choices[0]["message"].content?.split('\n') as string[];
        const decompositionDocuments: Document[] = [];
        for(const item of decompositionResponse){
            const similaritySearchDecomposition = await pineconeStore.similaritySearch(item, 1,{
                namespace:namespace
            });
            decompositionDocuments.push(new Document({
                pageContent: similaritySearchDecomposition.map((m)=>m.pageContent)[0],
                metadata: similaritySearchDecomposition.map((m)=>m.metadata)
            }));
        }

        const decompositionCombinedDocs = new Document({
            pageContent: decompositionDocuments.map(l=>l.pageContent).join(' '),
            metadata: decompositionDocuments.flatMap(l=>l.metadata)
            });

        const llm = new ChatOpenAI({
            modelName: "gpt-3.5-turbo-0125",
            temperature: 0,
            prefixMessages: [
                {role:"system",
                //TODO: this should be dynamic.
                content:`you are a helpful assistant that answers question based only on following context.\n 
                You will answer "Im sorry, I don't know the answer for that question" if the question is out of context.
                Do not try to create your own answer.

                Context: {context}`},
                {role:"user",
                content:"{query}"}
            ]
            });

            const chain = RetrievalQAChain.fromLLM(llm, retriever);
            const response = await chain.invoke({"context":decompositionCombinedDocs,"query":question});
            console.log(response.text);
            return NextResponse.json({status:200, data:response.text});
    } catch (error) {
        console.log(error);
        throw error;
    }
}