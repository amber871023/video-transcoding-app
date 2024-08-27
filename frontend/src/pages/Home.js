// pages/HomePage.js
import React from 'react';
import { Box, Button, Container, Heading, Text, VStack, HStack, Icon } from '@chakra-ui/react';
import { FaFileUpload, FaUserShield, FaVideo } from 'react-icons/fa';

const Home = () => {
  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="container.md" mt={10}>
        <VStack spacing={6}>
          <Heading as="h2" size="lg" textAlign="center">
            Convert Your Videos Easily
          </Heading>
          <Text textAlign="center">A user-friendly platform for converting your videos to various formats.</Text>
          <Button leftIcon={<FaFileUpload />} colorScheme="purple" size="lg">
            Upload a File
          </Button>
          <Text fontSize="sm" textAlign="center">Drag & drop file here or click to select files</Text>

          <Box textAlign="center" mt={8}>
            <Text fontSize="lg" fontWeight="bold">
              How to Convert Your Videos?
            </Text>
            <HStack justifyContent="center" mt={4}>
              <VStack>
                <Text>1.</Text>
                <Text>Click the “Choose Files” button to upload your video.</Text>
              </VStack>
              <VStack>
                <Text>2.</Text>
                <Text>Select the desired output format from the “Convert To” drop-down menu.</Text>
              </VStack>
              <VStack>
                <Text>3.</Text>
                <Text>Click the blue “Convert” button to begin the conversion process.</Text>
              </VStack>
            </HStack>
          </Box>

          {/* Why Choose Us */}
          <Box mt={8} textAlign="center">
            <Heading as="h3" size="md" mb={6}>
              Why choose ViTranscoding?
            </Heading>
            <HStack spacing={8} justifyContent="center">
              <VStack spacing={3}>
                <Icon as={FaFileUpload} w={10} h={10} color="purple.600" />
                <Text fontWeight="bold">User-Friendly Interface</Text>
                <Text textAlign="center" maxW="xs">
                  Our website is designed for ease of use, allowing you to convert videos quickly without technical hassles.
                </Text>
              </VStack>
              <VStack spacing={3}>
                <Icon as={FaVideo} w={10} h={10} color="purple.600" />
                <Text fontWeight="bold">Supports Any Format</Text>
                <Text textAlign="center" maxW="xs">
                  We support all popular formats like MP4, WMV, MOV, VOB, and AVI, as well as many less common ones.
                </Text>
              </VStack>
              <VStack spacing={3}>
                <Icon as={FaUserShield} w={10} h={10} color="purple.600" />
                <Text fontWeight="bold">Secure</Text>
                <Text textAlign="center" maxW="xs">
                  Your videos are processed securely, ensuring that your data remains private and protected throughout the conversion process.
                </Text>
              </VStack>
            </HStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default Home;
