#!node
import {BotService} from "./bot";

require("source-map-support").install();
import bodyParser from "body-parser";

import express from "express";
import * as http from "node:http";
import {TAG} from "./tag";

export const app = express();
app.use( bodyParser.json( { limit: '50mb' } ) );
app.use( bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use( bodyParser.raw({ limit: '50mb' } ) );
app.use( bodyParser.text( { limit: '50mb' } ) );

export const server = http.createServer( app );
let botService = new BotService();


app.get( "/api/product/filter/:name", (req, res, next) => {
    let name = req.params.name;
    botService.search( {
        name: name
    }, (error, response) => {
        if( error ){
            console.error( TAG, `Error ao proucurar o serviço`, error );
            return res.status( 500 ).json({
                result: false,
                message: `Error ao proucurar o serviço`,
                hint: error.message,
                operation: error["operation"]
            });
        }

        return res.json({
            result: true,
            products: response.products,
            failures: response.failures,
            founds: response.founds
        })
    });
});


app.post( "/api/product/filter", (req, res, next) => {
    let name = req.body.name;
    let toPage = req.body.toPage;
    let fromPage = req.body.fromPage;
    let maxPrice = req.body.maxPrice;
    let minPrice = req.body.minPrice;

    botService.search( {
        name: name,
        toPage,
        fromPage,
        maxPrice,
        minPrice
    }, (error, response) => {
        if( error ){
            console.error( TAG, `Error ao proucurar o serviço`, error );
            return res.status( 500 ).json({
                result: false,
                message: `Error ao proucurar o serviço`,
                hint: error.message,
                operation: error["operation"]
            });
        }

        return res.json({
            result: true,
            products: response.products,
            failures: response.failures,
            founds: response.founds
        })
    });
});


server.listen( 3000 );