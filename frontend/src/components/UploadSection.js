import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, VStack, Icon, Text } from '@chakra-ui/react';
import { FaFileUpload } from 'react-icons/fa';

const UploadSection = () => {
  const onDrop = useCallback((acceptedFiles) => {
    // Handle file upload
    console.log(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
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
        <Button mt={4} leftIcon={<FaFileUpload />} bg="#39349c"
          color="white"
          _hover={{ bg: "#151257" }}
          _active={{ bg: "#151257" }}
          boxShadow="xl" size="lg">
          Upload Files
        </Button>
        <Text fontSize="sm" color="gray.500">
          Drag & drop files here or click to select files
        </Text>
      </VStack>
    </Box>
  );
};

export default UploadSection;
