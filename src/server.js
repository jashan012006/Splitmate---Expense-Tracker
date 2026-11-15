require('dotenv').config();
const express=require('express');const path=require('path');const helmet=require('helmet');const cors=require('cors');const morgan=require('morgan');const rateLimit=require('express-rate-limit');
const connectDB=require('./config/db');const api=require('./routes/api');const {notFound,errorHandler}=require('./middleware/errors');
const app=express();
app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:process.env.CLIENT_ORIGIN||true}));app.use(express.json({limit:'100kb'}));app.use(express.urlencoded({extended:false,limit:'100kb'}));app.use(morgan('dev'));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,max:60,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(req,res)=>res.json({success:true,data:{status:'ok',database:require('mongoose').connection.readyState===1?'connected':'disconnected',time:new Date().toISOString()}}));
app.use('/api',api);app.use('/api',(req,res)=>res.status(404).json({success:false,message:`API route not found: ${req.method} ${req.path}`}));app.use(express.static(path.join(__dirname,'../public')));app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));app.use(notFound);app.use(errorHandler);
const port=Number(process.env.PORT)||5000;
if(require.main===module){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error('Startup blocked: set JWT_SECRET to a random secret at least 32 characters long in .env.');process.exit(1);}connectDB().then(()=>app.listen(port,()=>console.log(`SplitMate running at http://localhost:${port}`))).catch(err=>{console.error(`Startup blocked: ${err.message}`);process.exit(1);});}
module.exports=app;
