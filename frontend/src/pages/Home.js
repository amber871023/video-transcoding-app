import React from 'react';
import { Box, Button, Container, Heading, Text, VStack, HStack, Icon, Divider, Card, CardBody, CardHeader } from '@chakra-ui/react';
import { FaPager, FaUserShield, FaRegFileVideo } from 'react-icons/fa';
import UploadSection from '../components/UploadSection';

const Home = () => {
  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="container.lg" pt={10} pb={20}>
        <VStack spacing={6}>
          <UploadSection />

          <Divider borderBottomWidth={2} mt={5}></Divider>

          <Box textAlign="center" mt={5}>
            <Text fontSize="lg" fontWeight="bold">
              How to Convert Your Videos?
            </Text>
            <VStack justifyContent={"center"} alignItems={"flex-start"} mt={4}>
              <HStack>
                <Text bg="orange.400" color="white" px={3} py={1} borderRadius="md">1.</Text>
                <Text>Click the “Upload Files” button to upload your video.</Text>
              </HStack>
              <HStack>
                <Text bg="orange.400" color="white" px={3} py={1} borderRadius="md">2.</Text>
                <Text>After uploading, select the desired output format from the “Convert To” drop-down menu.</Text>
              </HStack>
              <HStack>
                <Text bg="orange.400" color="white" px={3} py={1} borderRadius="md">3.</Text>
                <Text>Click the blue “Convert” button to begin the conversion process.</Text>
              </HStack>
            </VStack>
          </Box>

          <Divider borderBottomWidth={2} mt={5}></Divider>

          {/* Why Choose Us */}
          <Box mt={5} textAlign="center">
            <Heading as="h3" size="md" mb={6}>
              Why choose ViTranscoding?
            </Heading>
            <HStack spacing={4} justifyContent="center">
              <Card maxW="sm" flex="1">
                <CardHeader pb={0}>
                  <Icon as={FaPager} w={10} h={10} color="purple.600" />
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold">User-Friendly Interface</Text>
                  <Text>
                    Our website is designed for ease of use, allowing you to convert videos quickly without technical hassles.
                  </Text>
                </CardBody>
              </Card>
              <Card maxW="sm" flex="1">
                <CardHeader pb={0}>
                  <Icon as={FaRegFileVideo} w={10} h={10} color="purple.600" />
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold">Supports Any Format</Text>
                  <Text>
                    We support all popular formats like MP4, WMV, MOV, VOB, and AVI, as well as many less common ones.
                  </Text>
                </CardBody>
              </Card>
              <Card maxW="sm" flex="1">
                <CardHeader pb={0}>
                  <Icon as={FaUserShield} w={10} h={10} color="purple.600" />
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold">Secure</Text>
                  <Text>
                    Your videos are processed securely, ensuring that your data remains private and protected throughout the conversion process.
                  </Text>
                </CardBody>
              </Card>
            </HStack>
          </Box>
        </VStack >
      </Container >
    </Box >
  );
};

export default Home;
