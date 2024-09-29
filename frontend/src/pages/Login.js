import React, { useState } from 'react';
import {
  Box, Button, Input, FormControl, FormErrorMessage, VStack, Heading, InputGroup, InputLeftElement, InputRightElement, IconButton, useToast,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const baseUrl = 'http://localhost:3001';
//const baseUrl = "http://group50-test.cab432.com:3001";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${baseUrl}/users/login`, { email, password }); // Changed to send email
      const { idToken, username, userGroup } = response.data;
      login({ idToken, username, userGroup });
      toast({
        title: 'Login successful.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setEmail('');
      setPassword('');
      if (userGroup === 'admin') {
        navigate('/users'); // Redirect to admin page
      } else {
        navigate('/'); // Redirect to home page for regular users
      }
    }catch{
      setError('Invalid email or password.');
      toast({
        title: 'Login failed.',
        description: error.response?.data?.msg || 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Box
      display="flex" alignItems="center" justifyContent="center"
      minHeight="84vh"
      bg="gray.50"
      px={5}
    >
      <Box
        w="full" maxW="lg"
        bg="white" px="60px" py={20}
        borderRadius="md"
        boxShadow="lg"
      >
        <Heading textAlign="center" mb={6}>
          Login
        </Heading>
        <VStack spacing={4}>
          <FormControl isInvalid={!!error}>
            <InputGroup>
              <InputLeftElement pointerEvents='none'>
                <FaEnvelope color='gray.300' />
              </InputLeftElement>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </InputGroup>
            <InputGroup mt={4}>
              <InputLeftElement pointerEvents='none'>
                <FaLock color='gray.300' />
              </InputLeftElement>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <InputRightElement>
                <IconButton
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  aria-label="Toggle Password Visibility"
                />
              </InputRightElement>
            </InputGroup>
            {error && <FormErrorMessage>{error}</FormErrorMessage>}
          </FormControl>
          <Button
            bg="#39349c"
            color="white"
            _hover={{ bg: "#151257" }}
            _active={{ bg: "#151257" }}
            w="full"
            mt={4}
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Login
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default LoginPage;
