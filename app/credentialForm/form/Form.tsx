/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import React, { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { FormControl, Box, Slide, Button } from '@mui/material'
import { FormData } from './types/Types'
import { Step0 } from './Steps/Step0_connectToGoogle'
import { Buttons } from './buttons/Buttons'
import DataComponent from './Steps/dataPreview'
import { SVGBack } from '../../Assets/SVGs'
import { createDID, signCred } from '../../utils/signCred'
import { GoogleDriveStorage, saveToGoogleDrive } from '@cooperation/vc-storage'
import { useSession, signIn } from 'next-auth/react'
import { handleSign } from '../../utils/formUtils'
import { saveSession } from '../../utils/saveSession'
import SnackMessage from '../../components/SnackMessage'
import SessionDialog from '../../components/SessionDialog'
import { useStepContext } from './StepContext'
import SuccessPage from './Steps/SuccessPage'
import FileUploadAndList from './Steps/Step3_uploadEvidence'
import { Step1 } from './Steps/Step1_userName'
import { Step2 } from './Steps/Step2_descreptionFields'

const Form = ({ onStepChange }: any) => {
  const { activeStep, handleNext, handleBack, setActiveStep, loading } = useStepContext()
  const [prevStep, setPrevStep] = useState(0)
  const [link, setLink] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [hasSignedIn, setHasSignedIn] = useState(false)
  const [snackMessage, setSnackMessage] = useState('')
  const [userSessions, setUserSessions] = useState<{}[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [fileId, setFileId] = useState('')
  const [image, setImage] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<any[]>([])

  const characterLimit = 294
  const { data: session } = useSession()
  const accessToken = session?.accessToken

  const storage = new GoogleDriveStorage(accessToken as string)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    trigger,
    formState: { errors, isValid }
  } = useForm<FormData>({
    defaultValues: {
      storageOption: 'Google Drive',
      fullName: session?.user?.name ?? '',
      persons: '',
      credentialName: '',
      credentialDuration: '',
      credentialDescription: '',
      portfolio: [],
      evidenceLink: '',
      description: ''
    },
    mode: 'onChange'
  })

  useEffect(() => {
    setPrevStep(activeStep + 1)
  }, [activeStep])

  const direction = activeStep > prevStep ? 'left' : 'right'

  const handleFetchinguserSessions = async () => {
    try {
      if (!accessToken) return
      const sessionFiles = await storage.getAllFilesByType('SESSIONs')
      if (!sessionFiles || sessionFiles.length === 0) return
      console.log('userSessions', sessionFiles)
      if (sessionFiles.length > 0) {
        setUserSessions(sessionFiles)
        setOpenDialog(true)
      }
    } catch (err) {
      console.error('Failed to fetch userSessions:', err)
      setErrorMessage('Failed to fetch user sessions')
    }
  }

  const handleuserSessionselect = (session: any) => {
    // Set the selected session values into the form
    setValue('fullName', session.fullName)
    setValue('persons', session.persons)
    setValue('credentialName', session.credentialName)
    setValue('credentialDuration', session.credentialDuration)
    setValue('credentialDescription', session.credentialDescription)
    setValue('portfolio', session.portfolio)
    setValue('evidenceLink', session?.evidenceLink)
    setValue('description', session.description)

    // Close the dialog
    setOpenDialog(false)
  }

  useEffect(() => {
    onStepChange()
  }, [activeStep])
  useEffect(() => {
    handleFetchinguserSessions()
  }, [])

  const costumedHandleNextStep = async () => {
    if (
      activeStep === 0 &&
      watch('storageOption') === 'Google Drive' &&
      !session?.accessToken &&
      !hasSignedIn
    ) {
      const signInSuccess = await signIn('google')
      if (!signInSuccess || !session?.accessToken) return
      setHasSignedIn(true)
      handleNext()
    } else {
      handleNext()
    }
  }

  const costumedHandleBackStep = async () => {
    if (activeStep > 0) {
      handleBack()
      await trigger()
    }
  }

  const handleFormSubmit = handleSubmit(async (data: FormData) => {
    try {
      await sign(data)
    } catch (error: any) {
      if (error.message === 'MetaMask address could not be retrieved') {
        setErrorMessage('Please make sure you have MetaMask installed and connected.')
        return
      } else {
        console.log('Error during VC signing:', error)
        setErrorMessage('An error occurred during the signing process.')
      }
    }
  })

  const sign = async (data: any) => {
    try {
      if (!accessToken) {
        setErrorMessage('Access token is missing')
        return
      }

      const { didDocument, keyPair, issuerId } = await createDID(accessToken)

      const saveResponse = await saveToGoogleDrive({
        storage,
        data: {
          didDocument,
          keyPair
        },
        type: 'DID'
      })

      const res = await signCred(accessToken, data, issuerId, keyPair, 'VC')
      const file = (await saveToGoogleDrive({
        storage,
        data: res,
        type: 'VC'
      })) as any
      const folderIds = await storage?.getFileParents(file.id)
      const relationFile = await storage?.createRelationsFile({
        vcFolderId: folderIds[0]
      })
      console.log('🚀 ~ sign ~ relationFile:', relationFile)
      setLink(`https://drive.google.com/file/d/${file.id}/view`)
      setFileId(`${file.id}`)

      console.log('🚀 ~ handleFormSubmit ~ res:', res)
      return res
    } catch (error: any) {
      console.error('Error during signing process:', error)
      throw error
    }
  }

  const handleSaveSession = async () => {
    try {
      const formData = watch() // Get the current form data
      setSnackMessage('Successfully saved in Your ' + formData.storageOption)
      if (!accessToken) {
        setErrorMessage('Access token is missing')
        return
      }
      await saveSession(formData, accessToken) // Save session data to Google Drive
    } catch (error: any) {
      setSnackMessage('Someting went wrong, please try agin later')
      console.error('Error saving session:', error)
    }
  }

  return (
    <Box sx={{ m: { xs: '50px auto', sm: '50px auto', md: '120px auto' } }}>
      <form
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '30px',
          alignItems: 'center',
          justifyItems: 'center',
          padding: ' 20px 20px 20px',
          overflow: 'auto',
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#FFF',
          margin: 'auto'
        }}
        onSubmit={handleFormSubmit}
      >
        <Box
          sx={{
            width: '100%',
            minWidth: { md: '400px' },
            maxWidth: { md: '720px' }
          }}
        >
          <FormControl sx={{ width: '100%' }}>
            {activeStep === 0 && (
              <Slide in={true} direction={direction} timeout={500}>
                <Box>
                  <Step0 />
                </Box>
              </Slide>
            )}
            {activeStep === 1 && (
              <Slide in={true} direction={direction} timeout={500}>
                <Box>
                  <Step1
                    watch={watch}
                    setValue={setValue}
                    register={register}
                    errors={errors}
                    handleNext={handleNext}
                  />
                </Box>
              </Slide>
            )}

            {activeStep === 2 && (
              <Slide in={true} direction={direction}>
                <Box>
                  <Step2
                    register={register}
                    watch={watch}
                    handleTextEditorChange={value =>
                      setValue('credentialDescription', value ?? '')
                    }
                    errors={errors}
                    control={control}
                  />
                </Box>
              </Slide>
            )}
            {activeStep === 3 && (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: { md: '720px' },
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <FileUploadAndList
                  watch={watch}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  setValue={setValue}
                />
              </Box>
            )}
            {activeStep === 4 && (
              <Slide in={true} direction={direction}>
                <Box>
                  <DataComponent formData={watch()} selectedFiles={selectedFiles} />
                </Box>
              </Slide>
            )}
            {activeStep === 5 && (
              <Slide in={true} direction={direction}>
                <Box>
                  <SuccessPage
                    formData={watch()}
                    setActiveStep={setActiveStep}
                    reset={reset}
                    link={link}
                    setLink={setLink}
                    setFileId={setFileId}
                    fileId={fileId}
                    storageOption={watch('storageOption')}
                    selectedImage={image}
                  />
                </Box>
              </Slide>
            )}
          </FormControl>
        </Box>
        {activeStep !== 5 && (
          <Buttons
            activeStep={activeStep}
            handleNext={activeStep === 0 ? costumedHandleNextStep : () => handleNext()}
            handleSign={() => handleSign(activeStep, setActiveStep, handleFormSubmit)}
            handleBack={costumedHandleBackStep}
            isValid={isValid}
            handleSaveSession={handleSaveSession}
            loading={loading}
          />
        )}
        {errorMessage && (
          <div
            style={{
              color: errorMessage.includes('MetaMask') ? 'red' : 'black',
              textAlign: 'center',
              marginTop: '20px'
            }}
          >
            {errorMessage}
          </div>
        )}
        {snackMessage ? <SnackMessage message={snackMessage} /> : ''}
      </form>
    </Box>
  )
}
export default Form
