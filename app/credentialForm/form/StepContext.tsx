import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback
} from 'react'

// Define the context structure
interface StepContextType {
  activeStep: number
  loading: boolean
  setActiveStep: (step: number) => void
  handleNext: () => Promise<void>
  handleBack: () => void
  setUploadImageFn: (fn: () => Promise<void>) => void
}

const StepContext = createContext<StepContextType>({
  activeStep: 0,
  loading: false,
  setActiveStep: () => {},
  handleNext: async () => {},
  handleBack: () => {},
  setUploadImageFn: () => () => {}
})

export const StepProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeStep, setActiveStep] = useState(0)
  const [uploadImageFn, setUploadImageFn] = useState<() => Promise<void>>(
    () => async () => {}
  )
  const [loading, setLoading] = useState(false)
  const excludedPaths = useMemo(
    () => ['/', '/privacy', '/accessibility', '/terms', '/claims'],
    []
  )

  const getStepFromHash = () => {
    const hash = window.location.hash
    const step = Number(hash.replace('#step', ''))
    return isNaN(step) ? null : step
  }

  useEffect(() => {
    const updateActiveStep = () => {
      const pathname = window.location.pathname
      const hashStep = getStepFromHash()
      const savedStep = localStorage.getItem('activeStep')

      if (excludedPaths.includes(pathname)) {
        return
      } else if (hashStep !== null) {
        setActiveStep(hashStep)
      } else if (savedStep) {
        setActiveStep(Number(savedStep))
      } else {
        setActiveStep(0)
      }
    }

    updateActiveStep()

    const handleLocationChange = () => {
      updateActiveStep()
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [excludedPaths])

  // Update localStorage and URL hash when the active step changes
  useEffect(() => {
    if (excludedPaths.includes(window.location.pathname)) {
      return
    }

    localStorage.setItem('activeStep', String(activeStep))
    window.location.hash = `#step${activeStep}`
  }, [activeStep, excludedPaths])

  const handleNext = useCallback(async () => {
    if (activeStep === 3 && typeof uploadImageFn === 'function') {
      setLoading(true) // Start loading
      try {
        await uploadImageFn() // Wait for image upload to complete
      } catch (error) {
        console.error('Error during image upload:', error)
      } finally {
        setLoading(false) // End loading
      }
    }
    setActiveStep(prevStep => prevStep + 1) // Move to the next step
  }, [activeStep, uploadImageFn])

  const handleBack = useCallback(() => {
    setActiveStep(prevStep => (prevStep > 0 ? prevStep - 1 : 0))
  }, [])

  const contextValue = useMemo(
    () => ({
      activeStep,
      setActiveStep,
      handleNext,
      handleBack,
      setUploadImageFn,
      loading
    }),
    [activeStep, handleNext, handleBack, setUploadImageFn, loading]
  )

  return <StepContext.Provider value={contextValue}>{children}</StepContext.Provider>
}

export const useStepContext = () => useContext(StepContext)
