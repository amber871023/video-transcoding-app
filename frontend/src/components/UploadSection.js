import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, VStack, Text, Select, HStack } from '@chakra-ui/react';
import { FaFileUpload } from 'react-icons/fa';
import CustomButton from './CustomButton';

const UploadSection = () => {
  const [uploadedFile, setUploadedFile] = useState(null); // State to store the uploaded file
  const [selectedFormat, setSelectedFormat] = useState('MP4'); // State to store the selected format

  const onDrop = useCallback((acceptedFiles) => {
    // Handle file upload
    setUploadedFile(acceptedFiles[0]);
  }, []);

  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };

  const handleConvert = () => {
    console.log(`Converting ${uploadedFile.name} to ${selectedFormat}`);
    // Implement the actual conversion logic here (e.g., call an API)
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setSelectedFormat('MP4');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <Box bg="gray.50" p={8}>
      {uploadedFile ? (
        <Box
          background={"gray.800"} rounded={10} p={6} textAlign="left"
          color="white" display="flex" alignItems="center" justifyContent="space-between"
        >
          <HStack>
            {/* <img
              src={URL.createObjectURL(uploadedFile)}
              alt="Video Thumbnail"
              style={{ width: '200px', height: 'auto', borderRadius: '10px' }}
            /> */}
            <VStack align="start" ml={4}>
              <Select value={selectedFormat} onChange={handleFormatChange}>
                <option value="MP4">MP4</option>
                <option value="AVI">AVI</option>
                <option value="MOV">MOV</option>
                <option value="WMV">WMV</option>
                {/* Add more formats as needed */}
              </Select>
              <Text>Size: {Math.round(uploadedFile.size / 1024 / 1024)} MB</Text>
              <Text>Duration: 00.00 mins</Text> {/* Placeholder for duration */}
              {/* <Text>File Type: {uploadedFile.type.split('/')[1].toUpperCase()}</Text> */}
            </VStack>
          </HStack>
          <HStack spacing={4}>
            <CustomButton onClick={handleRemove} bg="gray.500">
              Remove
            </CustomButton>
            <CustomButton onClick={handleConvert} bg="blue.600">
              Convert
            </CustomButton>
          </HStack>
        </Box>
      ) : (
        <Box
          background={"gray.200"} rounded={10} px={'150px'} py={'20'}
          textAlign="center"
          borderWidth="4px"
          borderColor={isDragActive ? "purple.500" : "gray.300"}
          borderStyle={isDragActive ? "solid" : "dashed"}
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <VStack spacing={4}>
            <Text fontSize="2xl" fontWeight="bold">
              Convert Your Videos Easily
            </Text>
            <Text fontSize="md" color="gray.600">
              A user-friendly platform for converting your videos to various formats.
            </Text>
            <CustomButton leftIcon={FaFileUpload}>
              Upload Files
            </CustomButton>
            <Text fontSize="sm" color="gray.500">
              Drag & drop files here or click to select files
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default UploadSection;
