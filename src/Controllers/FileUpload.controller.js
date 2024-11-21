import { FileModel } from '../models/File.model.js';

import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';



export const uploadFile = asyncHandler(async (req, res) => {


    const {originalName,mimetype,sizeofFile}=req.file;
    const { isshared, sharedwith, description, visibility } = req.body;

    try{
        const newFile=await FileModel.create({
            name: originalName,
            filetype: mimetype,
            size:sizeofFile,
            ownerid: req.user.userid, 
            isshared: isshared || false,
            sharedwith: sharedwith,
            description,
            visibility: visibility || 'private',
            metadata: { uploadDate: new Date() },
    
    
        });
        return res.status(200).json(new ApiResponse(200,{file:newFile},'File uploaded successfully'))

    }
    catch(error){
        console.error('Error in fileUploading..', error);
        throw new ApiError(500, "Failed to upload file");

    }
    

   
});


export const getFile=asyncHandler(async(req,res)=>{
    const file = await File.findByPk(req.params.fileid);

    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    const isAutorized=file.ownerid===req.user.userid;   //in later we will will do shared with other
    if (!isAutorized) {
        throw new ApiError(401, "Unauthorized access");
    }

    return res.status(200).json(new ApiResponse(200,{file},"Successfully Retrive File"))


});


export const downloadFile=asyncHandler(async(req,res)=>{
    const file = await File.findByPk(req.params.fileid);

    if (!file) {
        throw new ApiError(404, 'File not found');
    }
    const isAuthorized = file.ownerid === req.user.userId
    if (!isAuthorized) {
        throw new ApiError(403, 'Unauthorized access');
    }

    const filePath = path.resolve('uploads', file.name);


    if (fs.existsSync(filePath)) {
        res.download(filePath, file.name, (err) => {
            if (err) {
                throw new ApiError(500, 'Error downloading the file');
            }

            
        });
    } else {
        res.status(404).json({ error: 'File not found ' });
    };

    return res.status(200).json(new ApiResponse(200, null, 'File download started successfully'));


});

    
    
   
    


