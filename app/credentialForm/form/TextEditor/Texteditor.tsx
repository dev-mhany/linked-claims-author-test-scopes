import { useTheme } from '@mui/material/styles'
import React from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { Box, FormLabel } from '@mui/material'
import './TextEditor.css'
import Quill from 'quill'
const Delta = Quill.import('delta')

interface TextEditorProps {
  value: any
  onChange: (value: any) => void
}
const Clipboard = Quill.import('modules/clipboard')

class PlainClipboard extends Clipboard {
  quill: any

  onPaste(e: ClipboardEvent) {
    e.preventDefault()
    const range = this.quill.getSelection()
    if (range) {
      const text = (e.clipboardData || (window as any).clipboardData).getData(
        'text/plain'
      )
      const delta = new Delta().retain(range.index).delete(range.length).insert(text)
      this.quill.updateContents(delta, 'silent')
      this.quill.setSelection(range.index + text.length)
      this.quill.scrollIntoView()
    }
  }
}

Quill.register('modules/clipboard', PlainClipboard, true)

function TextEditor({ value, onChange }: Readonly<TextEditorProps>) {
  const theme = useTheme()

  const handleChange = (content: string) => {
    onChange(content)
  }

  const handleBlur = () => {
    console.log('Saving data:', value)
  }

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike', 'link'],
      [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
      ['code-block']
    ],
    clipboard: {
      matchVisual: false
    }
  }

  const formats = [
    'bold',
    'italic',
    'underline',
    'strike',
    'link',
    'list',
    'bullet',
    'code-block',
    'check'
  ]

  return (
    <Box sx={{ width: '100%', borderRadius: '8px' }}>
      <FormLabel
        sx={{
          color: theme.palette.t3BodyText,
          fontFamily: 'Lato',
          fontSize: '16px',
          fontWeight: 600
        }}
        id='editor-label'
      >
        What does that entail?
      </FormLabel>
      <Box className='text-editor-container' sx={{ borderRadius: '8px' }}>
        <ReactQuill
          theme='snow'
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          modules={modules}
          formats={formats}
          style={{ marginTop: '4px', borderRadius: '8px' }}
          placeholder='e.g., Cared for the plants I was responsible for across their full growing season and interacted with customers who were looking for plants suitable for particular conditions in their gardens'
        />
      </Box>
    </Box>
  )
}

export default TextEditor
